---
title: 'Making geolocation work on Geeksphone devices'
date: Thu, 01 May 2014 07:28:11 +0000
draft: false
permalink: making-geolocation-work-on-geeksphone-devices
tags: [firefoxos,hardware,android]
---

_This post is written for my own reference, in order to document the steps for getting geolocation working on Geeksphone phones._

For a long time, an easy way to get access to a Firefox OS phone was to order a _Peak_ or _Keon_ model from Geeksphone. The phone maker jumped on the Firefox OS train early on, offering reasonably priced phones aimed to early adopters.

These early adopters were in for a disappointing and frustrating surprise, as they would find out that geolocation didn't work or work haphazardly at best. Such a problem is ridiculous for smartphones sold in 2013, but since those were "developer preview" devices, people didn't complain too much about it.

Fast-forward to 2014. Geeksphone is now selling the [_Revolution_](http://www.geeksphone.com/#the-phone) model—a pretty good and powerful phone—aimed to end users, but to those users dismay it still has the same geolocation problems. Because I want to eat my own dog food, I am now using the Revolution as my personal phone and the lack of geolocation has been an enormous frustration.

So, I set out to either make GPS work on my phone or to go back to my trusty iPhone and wait for another phone maker to come up with a Firefox OS compatible phone that matched the Revolution specs.

After looking at many different sources and thanks to some good pointers from [Fernando Jiménez](http://twitter.com/f_jimenez) and [Francisco Jordano](http://twitter.com/mepartoconmigo), I managed to make it work. Kind of. The hardware to make geolocation possible is definitely there, and the problem looks like it is a configuration one.

I documented below the steps that made geolocation work for me on the Geeksphone Revolution:

#### Configuration steps

Connect your phone to the computer, open a terminal and make sure you can see the phone using _adb_:

```
$ adb devices List of devices attached FC7C80DF device
```
Retrieve the following files using _adb pull_:

```
$ adb pull /system/b2g/defaults/pref/user.js 
$ adb pull /etc/gps.conf
```

#### user.js

Change (or add) the properties `geo.gps.supl_server` and `geo.gps.supl_port` in _user.js_ to user Google's GPS server. My _user.js_ file looks like this:

```
pref('browser.manifestURL', "app://system.gaiamobile.org/manifest.webapp"); pref('browser.homescreenURL', "app://system.gaiamobile.org/index.html"); pref('network.http.max-connections-per-server', 15); pref('dom.mozInputMethod.enabled', true); pref('ril.debugging.enabled', false); pref('dom.mms.version', 17); pref('b2g.wifi.allow_unsafe_wpa_eap', true); pref('network.dns.localDomains', "gaiamobile.org,calendar.gaiamobile.org,fl.gaiamobile.org,camera.gaiamobile.org,communications.gaiamobile.org,gallery.gaiamobile.org,keyboard.gaiamobile.org,video.gaiamobile.org,homescreen.gaiamobile.org,wallpaper.gaiamobile.org,music.gaiamobile.org,bluetooth.gaiamobile.org,ringtones.gaiamobile.org,sms.gaiamobile.org,wappush.gaiamobile.org,email.gaiamobile.org,setringtone.gaiamobile.org,browser.gaiamobile.org,system.gaiamobile.org,clock.gaiamobile.org,settings.gaiamobile.org,pdfjs.gaiamobile.org,costcontrol.gaiamobile.org,marketplace.firefox.com.gaiamobile.org"); pref("app.update.url", "http://gpfos.s3.amazonaws.com/revolution/update.xml"); pref("geo.gps.supl_server", "supl.google.com"); pref("geo.gps.supl_port", 7276); pref("dom.payment.provider.0.name", "firefoxmarket"); pref("dom.payment.provider.0.description", "marketplace.firefox.com"); pref("dom.payment.provider.0.uri", "https://marketplace.firefox.com/mozpay/?req="); pref("dom.payment.provider.0.type", "mozilla/payments/pay/v1"); pref("dom.payment.provider.0.requestMethod", "GET");
```

####gps.conf

Replace the contents in _gps.conf_ with the following ones. I got to this particular configuration after looking into different sources, and adapted it to my needs (the NTP server is the Dutch one, for example). I wrote comments to clarify some settings.

```bash
# Change Country and Region! see http://www.pool.ntp.org/en/ NTP_SERVER=nl.pool.ntp.org NTP_SERVER=0.nl.pool.ntp.org NTP_SERVER=1.nl.pool.ntp.org NTP_SERVER=2.nl.pool.ntp.org NTP_SERVER=3.nl.pool.ntp.org NTP_SERVER=europe.pool.ntp.org NTP_SERVER=0.europe.pool.ntp.org NTP_SERVER=1.europe.pool.ntp.org NTP_SERVER=2.europe.pool.ntp.org NTP_SERVER=3.europe.pool.ntp.org AGPS=http://xtra1.gpsonextra.net/xtra.bin XTRA_SERVER_1=http://xtra1.gpsonextra.net/xtra.bin XTRA_SERVER_2=http://xtra2.gpsonextra.net/xtra.bin XTRA_SERVER_3=http://xtra3.gpsonextra.net/xtra.bin DEFAULT_AGPS_ENABLE=TRUE DEFAULT_USER_PLANE=TRUE DEFAULT_SSL_ENABLE=FALSE REPORT_POSITION_USE_SUPL_REFLOC=1 QOS_ACCURACY=50 QOS_TIME_OUT_STANDALONE=80 QOS_TIME_OUT_AGPS=95 QosHorizontalThreshold=1000 QosVerticalThreshold=500 AssistMethodType=1 AgpsUse=1 AgpsMtConf=0 AgpsMtResponseType=1 AgpsServerType=1 AgpsServerIp=3232235555 # Intermediate position report, 1=enable, 0=disable INTERMEDIATE_POS=1 # Accuracy threshold for intermediate positions # less accurate positions are ignored, 0 for passing all positions ACCURACY_THRES=3000 C2K_HOST=c2k.pde.com C2K_PORT=1234 ### AGPS server settings for Google ### SUPL_HOST=supl.google.com SUPL_PORT=7276 SUPL_SECURE_PORT=7278 SUPL_NO_SECURE_PORT=3425 SUPL_TLS_HOST=FQDN SUPL_TLS_CERT=/etc/SuplRootCert # Carrier tags used universally in GPS configs CURRENT_CARRIER=common # Indoor Positioning Settings # 0: QUIPC disabled, 1: QUIPC enabled, 2: forced QUIPC only QUIPC_ENABLED=1 #Use WiFi 1=”On”, 0=”Off” ENABLE_WIPER=1
```

Now, since Google uses a GeoTrust certificate (you can check doing `openssl s_client -connect supl.google.com:7275` in the terminal), we need to retrieve it and generate the root certificate we will use in our phone:

```
$ wget https://www.geotrust.com/resources/root_certificates/certificates/GeoTrust_Global_CA.pem
$ openssl x509 -inform PEM -in GeoTrust_Global_CA.pem -outform DER -out SuplRootCert
```

Finally we need to upload all the files we modified into the device and reboot it:

```
$ adb remount
$ adb push user.js /system/b2g/defaults/pref/user.js
$ adb push gps.conf /etc/gps.conf
$ adb push SuplRootCert /etc/SuplRootCert
$ adb reboot
```

After doing this my geolocation worked, even indoors. It still takes some seconds to retrieve the AGPS fix and sometimes doesn't get it immediately, but I can say that it works well enough to not drive me mad. Good luck!

#### Sources

[How to create a SuplRootCert for supl.google.com](http://blog.cryptomilk.org/2012/07/24/how-to-create-a-suplrootcert-for-supl-google-com/)
[http://forum.geeksphone.com/index.php?topic=5886.msg62928#msg62928](http://forum.geeksphone.com/index.php?topic=5886.msg62928#msg62928)
[Bug 955880 - [GPS] GPS is not working anymore](https://bugzilla.mozilla.org/show_bug.cgi?id=955880) 
[Bug 908151 - [Geeksphone][GPS] Speedup Geolocation response time, currently takes about 10 minutes](https://bugzilla.mozilla.org/show_bug.cgi?id=908151) 
[Forum: How can I enable A-GPS on my Peak?](http://forum.geeksphone.com/index.php?topic=5410.0)``