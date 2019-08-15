---
title: 'Refactoring in Go: Using reflection'
date: Fri, 24 Aug 2018 16:51:23 +0000
draft: false
permalink: refactoring-in-go-using-reflection
tags: [golang, kubernetes, programming, refactoring, reflection]
---

Go's reflection API is quite the unknown for many developers. In this article, I'll use it in a familiar scenario to show that it can help you in your day to day coding.

<!-- more -->

### Scenario

Imagine that—for testing purposes—we want to regularly call a method in a random member in the [Kubernetes Client API](https://github.com/kubernetes/client-go) to check that the cluster is responding properly to our requests. So, with `c` being a `Kubernetes.Clientset`, we want to call a method `List` in each different member, randomly.

```go
c.ConfigMaps(Namespace).List(v1.ListOptions{}) 
c.Pods(Namespace).List(v1.ListOptions{}) 
c.Deployments(Namespace).List(v1.ListOptions{})
... 
```

As you can see, it is the same call, just to different members `ConfigMaps`, `Pods`, `Deployments`, etc. In the end, we want to have a function `getRandomApiFunction` that returns one of these methods randomly so  we can call it. The problem is that each object has a different type signature, so we can't write generic code to handle them all (this article would be a _lot_ easier to write if Go had Generics...but this is a whole other debate). Let's get our hands dirty and see how we can do this.

### The code we found

This is the code found in the wild:

```go
const Namespace = "default"
type apiFunc func(*kubernetes.Clientset) (interface{}, error)

// Store a list of available API functions to test
var api_functions_list = []apiFunc{
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.ConfigMaps(Namespace).List(v1.ListOptions{}) 
    },
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.Pods(Namespace).List(v1.ListOptions{}) 
    },
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.Deployments(Namespace).List(v1.ListOptions{}) 
    },
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.ResourceQuotas(Namespace).List(v1.ListOptions{}) 
    },
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.ReplicaSets(Namespace).List(v1.ListOptions{}) 
    },
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.Secrets(Namespace).List(v1.ListOptions{}) 
    },
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.Services(Namespace).List(v1.ListOptions{}) 
    },
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.ServiceAccounts(Namespace).List(v1.ListOptions{}) 
    },
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.LimitRanges(Namespace).List(v1.ListOptions{}) 
    },
    func(c *kubernetes.Clientset) (interface{}, error) { 
        return c.Ingresses(Namespace).List(v1.ListOptions{}) 
    },
}

func getRandomApiFunction() apiFunc {
    rand.Seed(time.Now().UTC().UnixNano())
    rand_position := math.Mod(float64(rand.Int()), float64(len(api_functions_list)))
    return api_functions_list[int(rand_position)]
}
```

The code above works, and it's easy enough to understand, but it's a bit cumbersome. It starts by defining a new type `apiFunc`:

```go
type apiFunc func(*kubernetes.Clientset) (interface{}, error)
```

So whoever implements the `apiFunc` interface must be a member of the `kubernetes.Clientset` struct and must return a tuple with a value of _any_ kind (hence the `interface{}` declaration), and an error. `List` methods for different objects in all the Kubernetes Client API implement all those restrictions.

After that, we find a slice `api_functions_list` containing several identical functions that implement `apiFunc`, each calling the `List` method in a different Kubernetes object. 

Finally, `getRandomApiFunction` retrieves a random function in the slice and returns it, ready for us to use.

### Something smells funny

The smell in this code is the slice of functions that call Kubernetes API functions. It is redundant, given that all the functions are nearly identical. There must be a better solution.

### Let's reflect

We can find a definition of reflection in the [Go Blog](https://blog.golang.org/laws-of-reflection):

> Reflection in computing is the ability of a program to examine its own structure, particularly through types; it's a form of metaprogramming. It's also a great source of confusion.

That article is great for understanding how reflection _really_ works. If you want to understand the internals of reflection in Go, check it out!

#### Let's refactor!

First of all, we'll redefine `getRandomApifunction` so that it accepts a `kubernetes.Clientset` and returns an empty interface (that's the same signature that the anonymous functions had in the old code):

```go
func getRandomApiFunction(c *kubernetes.Clientset) (interface{}, error) {
    ...
} 
```

Then we create a slice with the set of objects we plan to call the `List` method on:

```go
var interfaceSlice = []interface{}{
    c.ConfigMaps,
    c.Deployments,
    c.ResourceQuotas,
    c.ReplicaSets,
    c.Services,
    c.ServiceAccounts,
    c.LimitRanges,
    c.Ingresses,
} 
```

Now is when it gets interesting. We want to be able to call `List` in any of these objects, regarding of their type signature. We create a function `callListMethodOnInterface`:

```go
func callListMethodOnInterface(kInterface interface{}) []reflect.Value {
    kInterfaceValue := reflect.ValueOf(kInterface)
    ListMethod := kInterfaceValue.MethodByName("List")
    params := []reflect.Value{reflect.ValueOf(v1.ListOptions{})}
    return ListMethod.Call(params)
} 
`````

`callListMethodOnInterface` takes a `kInterface` that can be any object, and returns an array of type `reflect.Value`. What's happening inside?

*   `kInterfaceValue := reflect.ValueOf(kInterface)` First we extract the reflect value of `kInterface`. This gives a value we can use reflection methods on.
  
*   `ListMethod := kInterfaceValue.MethodByName("List")` Since we know that all these entities have a `List` method, we retrieve it calling `MethodByName` on the reflection value.
  
*   The `List` method takes `v1.ListOptions{}` in all cases, so we extract its reflection value and put it into a `reflect.Value` array.
*   `ListMethod.Call(params)` is the equivalent of the calls the first version of this program did (e.g. `c.ConfigMaps(Namespace).List(v1.ListOptions{})`)

Now, how do we use this newly created `callListMethodOnInterface` function? Same as any other function, except for we have to unwrap the reflection values it returns into final values:

```go
// The randomization code is identical than before
rand.Seed(time.Now().UTC().UnixNano())
randomChoice := rand.Intn(len(interfaceSlice))
randomMethod := interfaceSlice[randomChoice].(apiFunc)

// Here's the call
retv := callListMethodOnInterface(randomMethod(Namespace))
return retv[0].Interface(), retv[1].Interface().(error) 
```

`callListMethodOnInterface` returns an array of reflect values (`[]reflect.Value`). In our case, two particular values: an `interface{}` and a potential `error` (the same ones as the `List` method). In order to "unbox" them to comply with the `getRandomApiFunction` signature, we call the `Interface()` method on each value, and in case of the `error` value, we cast it into a Go error. The final code we've written is this:

```go
import (
    "fmt"
    "math/rand"
    "reflect"
    "time"

    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/pkg/api/v1"
)

type apiFunc func(string) interface{}

func callListMethodOnInterface(kInterface interface{}) []reflect.Value {
    kInterfaceValue := reflect.ValueOf(kInterface)
    ListMethod := kInterfaceValue.MethodByName("List")
    params := []reflect.Value{reflect.ValueOf(v1.ListOptions{})}
    return ListMethod.Call(params)
}

func getRandomApiFunction(c *kubernetes.Clientset) (interface{}, error) {
    var interfaceSlice = []interface{}{
        c.ConfigMaps,
        c.Deployments,
        c.ResourceQuotas,
        c.ReplicaSets,
        c.Services,
        c.ServiceAccounts,
        c.LimitRanges,
        c.Ingresses,
    }

    rand.Seed(time.Now().UTC().UnixNano())
    randomChoice := rand.Intn(len(interfaceSlice))
    randomMethod := interfaceSlice[randomChoice].(apiFunc)
    retv := callListMethodOnInterface(randomMethod(Namespace))

    return retv[0].Interface(), retv[1].Interface().(error)
} 
```

### Final words

This is just a little test of what's possible with reflection, but I like it because it shows how to apply reflection to solve a simple, common problem. Reflection is not an area of Go that comes up very often, but it can be amazingly useful in some cases where the type system gets in the way of a problem you're trying to solve.

It's also important to keep in mind that reflection is also a wonderful way of shooting yourself in the foot: it makes it easy to overrule Go's type system, potentially making your programs harder to debug.

If you want some more scenarios where you could use reflection, check out [this post from Jon Bodner](https://medium.com/capital-one-developers/learning-to-use-go-reflection-822a0aed74b7). It comes with nice explanations and examples where Reflection can help in the real world, along with its main pros and cons.
