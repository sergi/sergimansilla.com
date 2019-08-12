---
title: 'Firefox disabled my extensions'
date: Thu, 13 Aug 2015 20:25:48 +0000
draft: false
permalink: firefox-disabled-my-extensions
tags: [firefox,rant]
---

Firefox—my browser of choice—just updated to version 41 beta. It turns out that from this version on, [any extension that hasn't been signed by Mozilla is disabled automatically](https://support.mozilla.org/en-US/kb/add-on-signing-in-firefox?as=u&utm_source=inproduct). Firefox didn't warn me about that. I had to go to the Add-ons panel to check why some of my extensions were not working, only to find that they were disabled. And I can't seem to find a place in the UI to opt out and allow unsigned extensions in my browser. And, you know, it's not that I use obscure extensions made by shady developers that don't care about security. The disabled extensions are:

*   [1password (Agilebits)](https://agilebits.com/onepassword)
*   [HTTPS Everywhere (EFF)](https://www.eff.org/Https-Everywhere)
*   [Privacy Badger (EFF)](https://www.eff.org/privacybadger)
*   [React Devtools (Facebook)](http://facebook.github.io/react/blog/2015/08/03/new-react-devtools-beta.html)

These are popular extensions made by reputable organizations. And the biggest irony is that some of them are extremely useful to _actually_ protect me from internet threats, such as identity theft, insecure communications or third-party tracking. I realize that Mozilla's intentions are good, and I strongly support signing extensions. Just don't dump it on us like this. The overall user experience of the transition is pretty terrible. Here are some ways this move could have been done better:

*   Give plenty of time to extension developers to sign extensions. This move seems pretty sudden. Perhaps developers have known for some time, but the fact that some big developers haven't signed yet could mean that it wasn't that clear.
*   Disable unsigned extensions by default, but explain that to the user upon first boot and offer the possibility of opting out for every extension.
*   Warn the user about unsigned extensions and let the user choose which ones to disable.

Anyway, I am sure there are many other ways in which this whole thing could have been done in a smoother way. I am now left unprotected from trackers, I can't use my passwords directly in the browser and I have to watch out manually for insecure connections. Unfortunately, I have no option but to install a previous version of Firefox or to (much easier) just switch to Chrome. At least until all the extension developers I care about manage to sign their extensions.

### Update

[Dale Harvey](https://twitter.com/daleharvey) tells me that setting the preference `xpinstall.signatures.required` to `false` disables the check. Good to know! Although I don't think it's a real solution for users that are not tech-savvy.