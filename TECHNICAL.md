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

---

## 2. "Wesley-ify" the photos

With the source photos in hand, the fun part: making everyone look like me.

The approach is a **LoRA fine-tuned on top of SDXL**. I collected a set of photos of myself, captioned them with a trigger token (`wesley_kamau`), and trained a LoRA using the kohya / Hollowstrawberry XL trainer. My local GPU (an RTX 3070, 8 GB) is too small for SDXL training, so training ran on Google Colab (A100/L4). The settings live in [`inference/loratraining.md`](./inference/loratraining.md).

Generating the final images isn't a plain text-to-image run — a prompt alone wouldn't keep each person's framing. Instead the inference notebook does an **inpainting** pass per photo:

1. Segment the person out of the profile picture with **SAM** (Segment Anything).
2. Read the rough pose (headshot vs. full-body) with **BLIP** visual question answering.
3. Inpaint the masked region with an **SDXL base + refiner** pipeline plus my LoRA, tuned per pose (strength ~0.65 for headshots / 0.70 for full-body, guidance 8.0, LoRA scale 0.95).

The result keeps the original's composition but swaps the subject for a Wesley-ified version. Each profile can have more than one version (`v1`, `v2`); the site prefers the newest. The full pipeline is in [`inference/`](./inference) — see its README.

## 3. Store the images

I genuinely considered bundling the processed images with the frontend. With ~3,300 profiles at source quality, that's hundreds of megabytes shipped to every visitor — a non-starter. So the originals and processed images go to **Cloudflare R2** (S3-compatible, no egress fees), and the metadata JSON just records the R2 object keys. The browser never talks to R2 directly: the site requests images through an API route that either resizes-and-caches a thumbnail or hands back a short-lived presigned URL.

## 4. Make the site

The front end is a **Next.js** app (App Router) deployed on **Vercel**, built to feel like a native Instagram-style app rather than a web page. You can search any profile by username or name and flip between their real photo and the Wesley-ified one. Images come through `/api/image` — thumbnails resized on the fly with `sharp`, full-res via presigned R2 URLs. The web app lives in [`web/`](./web); setup and details are in its README.

And the domain? [wesleygram.com](https://wesleygram.com). Rolls off the tongue.