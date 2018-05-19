## warframe-items docker image
Just the docker image for the bot that auto-updates everything. Pretty dumb
implementation right now - just fetch all, see if things changed, push if things
changed. In the future this will have to include hash-comparisons, especially
once images are implemented. As of now, it makes no difference though.
