Wesleygram - Technical breakdown.

This idea, although vague at first, came out to a few simple steps.

1. Download everyone's profile photos 
2. Do some ML inference to "Wesley-ify" images
3. Upload images to some form of web storage (can you believe I considered bundling with the frontend?)
4. Make the site & buy the domain

---

## 1. Download everyone's profile photos

### I thought this would be the easy part. Boy, was I wrong.

The first step was actually getting the images for the profile photos. I considered saving this for later because I thought it would be trivial, but I was actually quite wrong. Instagram does not have a friendly API, leading to a lot of workarounds, such as user agents, IP's, etc. I ended up doing this first becasue it was getting late and I thoght I could knock it out before bedtime.

I ended up working on it until 3 am and didn't finish until the next day.

My initial approach was simple, use a python library (Instaloader) to fetch my followers and following and then do something with the image urls. This led to two issues:

### 1. The library required authentication to fetch all followers and following.
### 2. The image urls were shrunk to 320x320

These proved to make the task a lot more difficault than I had originally assumed.

The library authentication seemed harmless at first, but quickly led to my account being flagged. It's pretty obvious Instagram doesn't want people scraping data from their platform, and this technically breaks their terms of use. I could've tried rotating accounts, but not only is that unstable, it would take a lot of manual human labor. Not ideal. Was it smart to use my personal account for this? No. Will I ever use a personal account for a silly project like this again? No. I create a throwaway for this project but if I avoided this approach, I probably wouldn't have needed it.

The urls that the library was recieving for the profile pictures were being capped at 320x320, which is not ideal. I believe the images were HD when using the library signed in, but since that was out the picture, the best I could get with no credentials were all lower quality images. Later on I saw this being an issue. Garbage in, garbage out. I knew there was a way to getting source quality profile photos, but this wasn't it.

I tried a few other things, to no luck. Until I discovered a website that exposed a graphql endpoint that had something very useful for me!

https://www.instagram.com/graphql/query/?doc_id=9539110062771438&variables={%22id%22:%22290944620%22,%22render_surface%22:%22PROFILE%22}

I found this endpoint that:

[x] Query by user (in this case, user ID)
[x] HD profile URL (with full metadata)
[x] No credentials or spoofing needed!

I truly don't think this project would have been possible without this. I knew that I was really close, but not quite there yet. For starters, at this point I had no user ID's, or any data at all. That would be my first priority.

For getting the lists of followers and following, I decided to export my data with instagram. This took about 15 minutes and it worked, but with an issue:

It was usernames, not ID's.

This wouldn't work for the graphql api without the ID's. So I began searching for a solution, at first, I thought of finding a way to retrieve ID from username, but a better solution arrived.

Chrome Extensions. I had tried a few, but all of the good ones that could do what I needed required a subscription to download more than 150 profiles. I thought this was crazy, I'm not trying to spend money on that. I gave up on extensions.

At least, until I found [This extension](https://github.com/edizbaha/instagram-pfp-downloader?tab=readme-ov-file) on GitHub, which seemed promising. A lot of the resources I found online for this task were VERY deprecated, but this one still worked, was open source, and did what I needed.

At least, most of what I needed.

The extension fetched a lot of useful data, but only saved the usernames. (I checked the data and the profile photos were still low quality). I was able to modify the extension to save the ID's and BOOM! Now I have everone's id's in `ids.json`.

With this, I updated the python script and I had everyone's profile photos downloaded.

I also upload the photos to CloudFlare R2, more on that later.