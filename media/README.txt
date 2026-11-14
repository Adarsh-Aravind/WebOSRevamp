Your own screen saver pictures and videos
=========================================

photos/  ->  put .jpg / .png / .webp files here (1920x1080 or bigger looks best)
videos/  ->  put .mp4 files here (H.264 or HEVC, up to 3840x2160 — these play in TRUE 4K)

Then run:   npm run tv:deploy
and pick "My Photos" or "My 4K Videos" in Glass -> Settings -> Welcome & Screen Saver.

Why videos for 4K? LG TVs draw apps (and photos inside them) at 1920x1080 and upscale,
but video is decoded at full 3840x2160. Keep the total size reasonable (a few hundred MB),
because everything here is installed onto the TV.
