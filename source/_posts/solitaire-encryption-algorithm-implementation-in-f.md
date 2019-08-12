---
title: 'Solitaire Encryption Algorithm implementation in F#'
date: Mon, 13 Oct 2008 21:45:48 +0000
draft: false
permalink: solitaire-encryption-algorithm-implementation-in-f
tags: [algorithm, cryptography, encryption, fsharp]
---

I first read about the [Solitaire algorithm](http://www.schneier.com/solitaire.html) in the novel [Cryptonomicon](http://en.wikipedia.org/wiki/Cryptonomicon), by Neal Stephenson. Being a geeky kid fascinated by computers I thought that it was a brilliant idea, but my curiosity didn’t go so far as to make me write an implementation of it (you can find a perl version in the book, which by the way I consider to be another great way to encrypt information).

Solitaire is a [Stream Cipher](http://en.wikipedia.org/wiki/Stream_cipher) created by [Bruce Schneier](http://www.schneier.com) and designed to be used with only a deck of cards. No electronic devices are needed and its security is intended to be of military-strength; that means that even if the way to generate/decipher messages is manual and might look a bit rudimentary, ideally not even the most powerful government could ever decipher a message generated with Solitaire (although some potential flaws have been [reported](http://www.ciphergoth.org/crypto/solitaire)).

So after playing with [F#](http://research.microsoft.com/fsharp/fsharp.aspx) lately, I decided to write some non-trivial code in order to see how it suits my coding style and habits, and yet another naive implementation of this curious crypto-algorithm was born.

<!-- more -->

### Notes about the implementation

After the initial struggle learning the particularities of F# (which are basically the same as ocaml) I quickly felt comfortable with it. It’s a very versatile language, given that it allows the programmer to use functional and imperative programming at his own will, so the learning curve is not very steep. And although the functional approach should be used most of the time, sometimes imperative code is more convenient and can make some programmers with a C or Java background feel more in control. For an example, consider this snippet of code:

```fsharp
member s.KeyStream (c: char list) f =
  match c with
  | x :: xs  -> 
    let mutable o = s.getOutput
    while o = jokerA or o = jokerB do
      o <- s.getOutput;
    (Convert.ToChar (((f x o) % 26) + 65) :: s.KeyStream xs f)
  |[] ->  [];
```

Here I am using a functional approach to go through a list of characters and apply a given function and some calculations to each one of them. The whole transformation is based on the value of the variable `o`, but I only want to use `o` if it is not equal to a joker value (you can read about the algorithm internals on the [wikipedia article](http://en.wikipedia.org/wiki/Solitaire_cipher)), so I use a very convenient `while` block that does the job. Sure, it can be done with recursivity as well, but F# lets you choose what suits you better. In this snippet I am also using one of the most powerful ideas of the functional world: [pattern matching](http://en.wikipedia.org/wiki/Pattern_matching). As the name says, a pattern match takes an expression between the `match … with` block and compares it against a set of rules which test the expression given and returns a result. The concept is close to the good old `switch/case` statement, but much more powerful, because it allows the programmer to use conditions, name binding and object decomposing in the rules. The net is full of [examples](http://devhawk.net/2007/11/29/F+Hawkeye+Pattern+Matching.aspx) and [articles](http://weblogs.asp.net/podwysocki/archive/2008/03/17/adventures-in-f-f-101-part-5-pattern-matching.aspx) about [it](http://diditwith.net/2008/02/19/WhyILoveFPatternMatching.aspx) where you can learn how to use them effectively.

The code also makes a basic use of some of the different paradigms that F# allows. For example, it uses OO for the Solitaire class to take advantage of mutable variables (a clear deviation from functional pureness and as I said, one of the strong points of the language) so the same variable can be used when keying the deck and by the encryption/decryption methods, but I use global functions for card manipulation operations. Sure, there could be a Deck class that includes card manipulation methods, but as I said before, this code is just for my own experimentation purposes.

I borrowed some utility functions from Haskell Prelude (`span`, `splitAt`) to help me with string manipulation, although I am sure that there are dozens of Ocaml libraries that already have a version of them. I am lazy and I just implemented the ones I needed and knew from Haskell.

This implementation is not intended to be efficient and of course there might be better ways to write it, this code was only written for fun and to teach myself some F# discipline, so it is not written in the most optimal way, but in the clearest one. I would gladly accept suggestions of how to improve it. I feel like I just started scratching the surface of what can be done with F# and I can’t wait to unleash its real potential. 

The code below is the working algorithm, and you can find the complete source code including tests [here](http://sergimansilla.com/public/Solitaire/Solitaire.fs).

```fsharp
#r "FSharp.PowerPack.dll"

open System

(* Utility functions *)

let getCharValue c =
  let alphabet = Seq.to_list "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  (List.find_index (fun x -> c = x) alphabet)

(* Adds 'X' characters until the list has a length multiple of 5, as stated in Schneier's page *)
let rec mod5 (msg: char list) =
  if (List.length msg) % 5 <> 0 then mod5 (msg @ [ 'X' ])
  else msg

let sanitize _string =
  _string
  |> Seq.to_list
  |> List.filter (fun c -> Char.IsLetter c)
  |> List.map Char.ToUpper

(* Functions borrowed from Haskell *)
let span p xs =
  (Seq.to_list (Seq.take_while p xs), Seq.to_list (Seq.skip_while p xs))

(* Splits a list into two lists at the position corresponding to the given integer *)
let rec splitAt n xs =
  match (n, xs) with
  | (0, xs) -> ([], xs)
  | (_, []) -> ([], [])
  | (n, x :: xs) ->
    let t = splitAt (n - 1) xs
    (x :: fst t, snd t)

(* Deck Manipulation functions *)
let jokerA = 53
let jokerB = 54

(* Moves down a card in the deck *)
let md (c: int) (d) =
  match span (fun x -> x <> c) d with
  | (y :: ys, [ x ]) -> y :: x :: ys
  | (ys, x :: z :: zs) -> ys @ [ z; x ] @ zs
  | (_, _) -> []

let md2 c d = md c (md c d)

let tripleCut deck =
  let tripleCut2 c acc =
    match acc with
    | [] -> [ c ] :: acc
    | h :: t ->
      if c = jokerA ``or`` c = jokerB then [] :: [ c ] :: acc
      else (c :: h) :: t

  let s = List.fold_right tripleCut2 deck [ [] ]
  [ s.[4]
    s.[1]
    s.[2]
    s.[3]
    s.[0] ]
  |> List.concat

let countCut index deck =
  match splitAt index deck with
  | (xs, [ x ]) -> deck
  | (xs, ys) ->
    let split = splitAt (ys.Length - 1) ys
    fst split @ xs @ snd split

type Solitaire() =
  let mutable Cards = [ 1..jokerB ]
  member s.Deck = Cards

  member s.getOutput =
    Cards <- Cards
             |> md jokerA
             |> md2 jokerB
             |> tripleCut
    Cards <- countCut (if Cards.[jokerA] = jokerB then jokerA
                       else Cards.[jokerA]) Cards
    if Cards.Head = jokerB then Cards.[jokerA]
    else Cards.[Cards.Head]

  member s.keyDeck keys =
    Cards <- [ 1..jokerB ]
    let keyArray =
      keys
      |> sanitize
      |> Seq.to_list
    List.iter (fun (c: char) ->
      s.getOutput |> ignore
      Cards <- countCut (Convert.ToInt32 c - 64) Cards) keyArray

  member s.KeyStream (c: char list) f =
    match c with
    | x :: xs ->
      let mutable o = s.getOutput
      while o = jokerA ``or`` o = jokerB do
        o <- s.getOutput
      (Convert.ToChar(((f x o) % 26) + 65) :: s.KeyStream xs f)
    | [] -> []

  member s.Encrypt msg =
    s.KeyStream (msg
                 |> sanitize
                 |> mod5) (fun x o -> (getCharValue x) + (o % 26))

  member s.Decrypt msg =
    s.KeyStream (msg
                 |> sanitize
                 |> mod5) (fun x o ->
      let k = (getCharValue x) - (o % 26)
      if k < 65 then k + 26
      else k)

(* Unit testing *)
let vectors =
  [ [ "AAAAAAAAAAAAAAA"; ""; "EXKYIZSGEHUNTIQ" ]
    [ "AAAAAAAAAAAAAAA"; "f"; "XYIUQBMHKKJBEGY" ]
    [ "AAAAAAAAAAAAAAA"; "fo"; "TUJYMBERLGXNDIW" ]
    [ "AAAAAAAAAAAAAAA"; "foo"; "ITHZUJIWGRFARMW" ]
    [ "AAAAAAAAAAAAAAA"; "aa"; "OHGWMXXCAIMCIQP" ]
    [ "AAAAAAAAAAAAAAA"; "aaa"; "DCSQYHBQZNGDRUT" ]
    [ "AAAAAAAAAAAAAAA"; "b"; "XQEEMOITLZVDSQS" ]
    [ "AAAAAAAAAAAAAAA"; "bc"; "QNGRKQIHCLGWSCE" ]
    [ "AAAAAAAAAAAAAAA"; "bcd"; "FMUBYBMAXHNQXCJ" ]

    [ "AAAAAAAAAAAAAAAAAAAAAAAAA"; "cryptonomicon"; "SUGSRSXSWQRMXOHIPBFPXARYQ" ]
    [ "SOLITAIRE"; "cryptonomicon"; "KIRAKSFJAN" ] ]

let rec test (arr: string list list) =
  match arr with
  | x :: xs ->
    let key = x.Tail.Head
    let correct_enc = List.hd (List.tl x.Tail)
    print_endline
      ("Testing vector: "
       ^ x.Head ^ "\\nwith key: " ^ key ^ "\\nshould output:\\t" ^ correct_enc)
    let cipher = new Solitaire()
    cipher.keyDeck key
    let enc = new String(List.to_array (cipher.Encrypt x.Head))
    cipher.keyDeck key
    let dec =
      String.sub (new String(List.to_array (cipher.Decrypt enc))) 0
        x.Head.Length
    print_endline
      ("and it outputs:\\t"
       ^ enc
         ^ "\\ndecryption:\\t" ^ dec ^ "\\n[Encryption test: " ^ if enc = correct_enc then
                                                                   "CORRECT!]"
                                                                 else "FAIL!]")
    print_endline ("[Decryption test: " ^ if dec = x.Head then "CORRECT!]\\n\\n"
                                          else "FAIL!]\\n\\n\\n")
    test xs
  | [] -> print_endline "All tests Finished."

(* Command line parser *)

let _ =
  match Sys.argv with
  | [| _; "-test" |] -> test vectors
  | [| _; "-enc"; _; _ |] ->
    let cipher = new Solitaire()
    cipher.keyDeck (Sys.argv.[3])
    print_endline (new String(List.to_array (cipher.Encrypt(Sys.argv.[2]))))
  | [| _; "-dec"; _; _ |] ->
    let cipher = new Solitaire()
    cipher.keyDeck (Sys.argv.[3])
    print_endline (new String(List.to_array (cipher.Decrypt(Sys.argv.[2]))))
  | _ ->
    print_endline
      ("Usage:\\tSolitaire -test\\n\\t"
       ^ "Solitaire -enc text key\\n\\t" ^ "Solitaire -dec ciphertext key\\n\\n")
    print_endline ("Example: Solitaire -enc SECRETMESSAGE foo")
```

The great thing about F# is that is a member of the .NET family of languages, so it can interact with the .NET framework just as C# would. In the code above I am not using much of explicit .NET related code, but I definitely want to explore it…just imagine the potential uses of combining ideas like pattern matching with existing .NET objects. [Cool](http://langexplr.blogspot.com/2007/05/pattern-matching-on-net-objects-with-f.html).