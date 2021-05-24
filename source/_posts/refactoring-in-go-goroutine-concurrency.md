---
title: 'Refactoring in Go: goroutine concurrency'
date: Thu, 09 Aug 2018 21:18:18 +0000
draft: false
tags: [concurrency, golang, goroutines, programming, refactoring]
---

Surprise! I write Go these days.

Lately I've been finding some code out in the wild that uses naive solutions for concurrency. Given the times I've seen similar patterns, my theory is that it is probably inspired by basic goroutines example code out there.

<!-- more -->

### The scenario

Imagine you want to run a particular number of tasks that are easily to parallelize (no side-effects, no external dependencies, etc.), and you want to store the result of each one of them. The way to do that in Go is with Goroutines.

The real-world code I refactored calculated the average DNS latency in our system by calling `net.LookupHost` 100 times. Let's see it.

### Actual code found in the wild

This is the (adapted and simplified) code found out in the wild. Take a look and let's discuss it below:

```go
func AverageLatency(host string) (latency int64, err error) {
    CONCURRENCY := 4
    REQUESTS_LIMIT := 100

    dnsRequests := make(chan int, REQUESTS_LIMIT)
    results := make(chan int64, REQUESTS_LIMIT)
    errorsResults := make(chan string, REQUESTS_LIMIT)

    for w := 1; w <= CONCURRENCY; w++ {
        go dnsTest(dnsRequests, results, errorsResults, host)
    }

    for j := 1; j <= REQUESTS_LIMIT; j++ {
        dnsRequests <- j
    }
    close(dnsRequests)

    requestsDone := 1
    for a := 1; a <= REQUESTS_LIMIT; a++ {
        select {
        case latencyLocal := <-results:
            latency = latency + latencyLocal
            requestsDone = requestsDone + 1
        case errorMsg := <-errorsResults:
            return 0, errors.New(errorMsg)
        case <-time.After(time.Second * DURATION_SECONDS):
            return latency / int64(requestsDone), nil
        }
    }
    return latency / int64(requestsDone), nil
}


func dnsTest(jobs <-chan int, results chan<- int64, errResults chan<- string, host string) {
    for range jobs {
        start := time.Now()
        if _, err := net.LookupHost(host); err != nil {
            errResults <- err.Error()
        }
        results <- time.Since(start).Nanoseconds() / int64(time.Millisecond)
    }
}
```

The main code does the following steps sequentially:

*   Launches `CONCURRENCY` number of goroutines `dnsTest`
*   Sends `REQUESTS_LIMIT` number of jobs to the goroutines using a channel (dnsRequests)
*   Closes the dnsRequests channel to signal to goroutines that there won't be any more jobs (so that they don't keep waiting)
*   It waits for `REQUESTS_LIMIT` amount of values coming from `results`, and we add each value to the `latency` variable. It also listens for errors and timeouts, exiting the function if any of those arrive.
*   In case of a timeout, it calculates the average latency with the values we have so far and exits.
*   Finally, it divides the value accumulated in `latency` with the amount of requests done to determine the average latency.

Whew. That's a way to do it…but is it idiomatic?

### Goroutines are cheap, let's take advantage of that

Goroutines are lightweight threads, which among other things means we can launch lots of them without impacting our program's performance too much. So why not launch as many goroutines as jobs we have? This way we get rid of a channel just used for iteration, and all the business logic that goes with it. We can also move the goroutine code inside the loop, given that it's small enough:

```go
func AverageLatency(host string) (latency int64, err error) {
    REQUESTS_LIMIT := 100

    results := make(chan int64, REQUESTS_LIMIT)
    errorsResults := make(chan string, REQUESTS_LIMIT)

    for w := 1; w <= REQUESTS_LIMIT; w++ {
        go func() {
            start := time.Now()
            if _, err := net.LookupHost(host); err != nil {
                errorResults <- err.Error()
                return
            }
            results <- time.Since(start).Nanoseconds() / int64(time.Millisecond)
        }
    }

    requestsDone := 1
    for a := 1; a <= REQUESTS_LIMIT; a++ {
        select {
        case latencyLocal := <-results:
            latency = latency + latencyLocal
            requestsDone = requestsDone + 1
        case errorMsg := <-errorsResults:
            return 0, errors.New(errorMsg)
        case <-time.After(time.Second * DURATION_SECONDS):
            return latency / int64(requestsDone), nil
        }
    }
    return latency / int64(requestsDone), nil
}
```

The code is a bit clearer now. We loop `REQUESTS_LIMIT` times and create a goroutine each time that checks the latency of looking up a host. Then we wait for the channels `results`, `errorResults`, and `time.After(..)` to yield values `REQUESTS_LIMIT` times.

### Leveraging WaitGroup and cleaning up

I'm not too happy with the last loop, it looks a bit brittle and Go has more elegant tools that help gather results from spawned gouroutines. One of those is the `WaitGroup`. A `Waitgroup` is a construct that waits for a group of routines to finish, without us doing much on our part. We just increase the `WaitGroup` counter using `WaitGroup.Add` with each goroutine we run, and we call `WaitGroup.Done` when a goroutine is finished.

```go
func AverageLatency(host string) (latency int64, err error) {
    REQUESTS_LIMIT := 100
    results := make(chan int64, REQUESTS_LIMIT)
    errorsResults := make(chan string, REQUESTS_LIMIT)

    var wg sync.WaitGroup
    wg.Add(REQUESTS_LIMIT)

    for j := 0; j < REQUESTS_LIMIT; j++ {
        go func() {
            defer wg.Done()
            start := time.Now()
            if _, err := net.LookupHost(host); err != nil {
                errorResults <- err.Error()
                return
            }
            results <- time.Since(start).Nanoseconds() / int64(time.Millisecond)
        }
    }

    wg.Wait()

    ...
}
```

At this point we don't need channels to collect errors and results, and we can make do with more traditional datatypes.

I'd also like to collect the number of errors for monitoring purposes, not only return whenever there is a single one. We can check the logs manually if we want to see the actual error messages:

```go
type Metrics struct {
    AverageLatency float64
    RequestCount   int64
    ErrorCount     int64
}

func AverageLatency(host string) Metrics {
    REQUESTS_LIMIT := 100
    var errors int64
    results := make([]int64, 0, DEFAULT_REQUESTS_LIMIT)

    var wg sync.WaitGroup
    wg.Add(REQUESTS_LIMIT)

    for j := 0; j < REQUESTS_LIMIT; j++ {
        go func() {
            defer wg.Done()
            start := time.Now()
            if _, err := net.LookupHost(host); err != nil {
                fmt.Printf("%s", err.Error())
                atomic.AddInt64(&errors, 1)
                return
            }
            append(results, time.Since(start).Nanoseconds() / int64(time.Millisecond))
        }
    }

    wg.Wait()

    return CalculateStats(&results, &errors)
}
```

We created a new type `Metrics` to group the values we want to monitor. We now set the `wg` counter to the number of requests we plan to do, and we call `wg.Done` when each goroutine finishes, regardless o whether it was successful or not. Then we wait for all the goroutines to finish. We also extracted all the stats calculations to an external `CalculateStats` function, so that `AverageLatency` is focused on collecting the raw values.

For the sake of completion, `CalculateStats` could look like this:

```go
// Takes amount of requests and errors and returns some stats on a
// `Metrics` struct
func CalculateStats(results *[]int64, errors *int64) Metrics {
    successfulRequests := len(*results)
    errorCount := atomic.LoadInt64(errors)

    // Sum up all the latencies
    var totalLatency int64 = 0
    for _, value := range *results {
        totalLatency += value
    }

    avgLatency := float64(-1)

    if successfulRequests > 0 {
        avgLatency = float64(totalLatency) / float64(successfulRequests)
    }

    return Metrics{
        avgLatency,
        int64(successfulRequests),
        errorCount
    }
}
```

### Wait, where's the timeout?!

Oh, right. We kind of forgot to restore the timeout in our last refactor, didn't we?

Having a timeout while using `WaitGroup` is a bit more cumbersome, but using channels becomes easy. Instead of directly calling `wg.Wait` we'll wrap that call in a new function called `waitWithTimeout`:

```go
func waitWithTimeout(wg *sync.WaitGroup, timeout time.Duration) bool {
    c := make(chan struct{})
    go func() {
        defer close(c)
        wg.Wait()
    }()

    select {
    case <-c:
        return false
    case <-time.After(timeout):
        return true
    }
}
```

Here we create a channel that will be closed once `wg.Wait()` runs, meaning that all the goroutines have finished. Then we use a `select` statement to return either when all the goroutines have finished, or when `timeout` amount of time has passed. In that case, we return `true` to signal that a timeout has happened.

Our final `AverageLatency` will finally look like this:

```go
func AverageLatency(host string) Metrics {
    REQUESTS_LIMIT := 100
    var errors int64
    results := make([]int64, 0, REQUESTS_LIMIT)

    var wg sync.WaitGroup
    wg.Add(REQUESTS_LIMIT)

    for j := 0; j < REQUESTS_LIMIT; j++ {
        go func() {
            defer wg.Done()
            start := time.Now()
            if _, err := net.LookupHost(host); err != nil {
                fmt.Printf("%s", err.Error())
                atomic.AddInt64(&errors, 1)
                return
            }
            append(results, time.Since(start).Nanoseconds() / int64(time.Millisecond))
        }
    }

    if waitWithTimeout(&wg, time.Duration(time.Second*DURATION_SECONDS)) {
        fmt.Println("There was a timeout waiting for DNS requests to finish")
    }
    return CalculateStats(&results, &errors)
}
```

In case of a timeout we just display a message, because we still want to know how many requests and errors were made regardless of whether there was a timeout or not.

### Bonus: Race condition!!

Ha, I'm sure you thought that was it and that everything was good in the world. But no! I sneaked in a race condition in the code. Some of you may have spotted it already. For the ones who haven't, I'll let you look at the code above for a minute. I'll wait.

Did you find it? Doesn't matter if you did, I won't judge you, I would probably not have found it myself. Thanks for humoring me anyway!

Ok let's see what this whole race condition thing is about.

#### Things are seldomly thread-safe in Go

Whenever we operate with Goroutines we have to be careful with modifying external variables, because they are usually not thread safe. In our main goroutine we do store the errors in a thread-safe way by using `atomic.AddInt64`, but we are storing latencies in the `results` slice, which is not thread-safe. There is absolutely no guarantee that the number of items in `results` will match the amount of requests we tried. Oops.

There are several ways we can solve that in Go, for example:

*   Go back to use a channel instead of a slice to gather latencies
*   Use Mutexes to regulate access to `results`
*   Use a channel with a buffer capacity of 1 that acts as a queue, and send latencies there

Given that we are already knee-deep in goroutines, I opted for using the third approach. It's also the approach I found the most idiomatic:

```go
func AverageLatency(host string) Metrics {
    var errors int64
    results := make([]int64, 0, REQUESTS_LIMIT)
    successfulRequestsQueue := make(chan int64, 1)

    var wg sync.WaitGroup
    wg.Add(DEFAULT_REQUESTS_LIMIT)

    for j := 0; j < REQUESTS_LIMIT; j++ {
        go func() {
            start := time.Now()

            if _, err := net.LookupHost(host); err != nil {
                atomic.AddInt64(&errors, 1)
                wg.Done()
                return
            }

            successfulRequestsQueue <- time.Since(start).Nanoseconds() / 1e6
        }()
    }

    go func() {
        for t := range successfulRequestsQueue {
            results = append(results, t)
            wg.Done()
        }
    }()

    if waitTimeout(&wg, time.Duration(time.Second*DURATION_SECONDS)) {
        fmt.Println("There was a timeout waiting for DNS requests to finish")
    }
    return CalculateDNSReport(&results, &errors)
}
```

We are creating a channel `successfulRequestsQueue` that can only buffer one value, effectively creating a synchronous queue. We can now send the latency result there instead of appending it to `results` directly. Then later we loop over all the incoming latencies in `successfulRequestsQueue` and we append it to `results` in that goroutine. We also moved the `wg.Done()` call to after the `append`. This way we ensure that every result will be processed and that there won't be race conditions.

### Conclusion

We could refactor this code further, but for the purpose of this article I think we can stop now. In case you want to keep going, I propose some improvements:

*   Make the computation function (right now `net.LookupHost`) generic, so that we can use a different function in tests, for example.
*   How would you write this code without goroutines?
*   Make the code completely independent from context, so that we can use it any time we want to store results from many operations.