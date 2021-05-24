---
title: 'Implement cursor-swiping in half an afternoon'
date: Thu, 21 Feb 2013 14:21:20 +0000
draft: false
tags: [device, firefox, firefoxos, javascript, mobile, os, programming]
---

If you haven't seen it yet, I suggest that you take a look at this concept video that made the rounds on the internet some months ago:

[youtube https://www.youtube.com/watch?v=RGQTaHGQ04Q&w=640]

I would pay to have this in my phone. Only, money wouldn’t help since I own an iPhone, and a developer has simply no way to access an internal component like the phone keyboard. Well, it only took a small part of an afternoon to implement a proof of concept of cursor-swiping in Firefox OS. And even if this swipe-selection implementation is only a prototype, it’s perfectly functional and I've already gotten used to its convenience. See a rough video I made here:

[youtube https://www.youtube.com/watch?v=uDzb7HZY2mE&w=640]

You can check out the code for it in [Comoyo's Gaia branch on GitHub](https://github.com/comoyo/gaia/compare/master...swipe_selection). I can't even express how amazing it is to hack the OS of the phone you use and adapt it to your needs in such an easy way and with such a fast development cycle. It makes me excited to think about what will happen once all these JavaScript developers discover that they can hack their phone and contribute to it using their favorite language. _Disclaimer: This implementation is in the Gaia fork that I use and I have no idea of whether it will make it into the actual OS eventually, since there are obvious UX implications that might be uncomfortable for some._