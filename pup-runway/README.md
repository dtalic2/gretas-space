# Pup Runway 🐾

Raise a puppy, level it up in challenges, win clothes and new dogs, then
strut the runway in fashion shows. The best-dressed dog wins **$1,000** in
round 1, **$2,000** in round 2, and so on, plus whatever extra the prize
wheel gives.

It's a single `index.html` with nothing to install. Open it in a browser, or
serve the folder over HTTP. Progress saves in the browser (`localStorage`).

## How it plays

1. **Pick a starter pup**: Golden Retriever, Pug or Corgi.
2. **Challenges** (🏆) earn XP and cash, and each win drops a prize. About
   4 in 5 prizes are a piece of clothing and 1 in 5 is a whole new dog.
   Challenges get harder as your dog levels up.
   - 🦴 **Treat Catch**: slide to catch treats and dodge bees
   - 🏃 **Hurdle Hop**: tap or press Space to jump hurdles (3 hearts)
   - 🌀 **Trick Time**: repeat a growing sequence of tricks
   - 🎾 **Ball Blast**: tap tennis balls, but not the cats
3. **Dress Up** (👗): six slots (hat, glasses, necklace, outfit, shoes,
   capes & wings), 57 items across four rarities.
4. **Fashion Show** (✨): round *N* needs a level *N+1* dog. Each round has
   a theme (Sparkle Night, Beach Party, Royal Ball, …). Three rival dogs
   walk first, then yours, and you tap **POSE!** three times as the marker
   passes through the gold zone. Score =
   outfit rarity + double points for on-theme items + 10 for a full outfit +
   charm (breed + 4 per level) + up to 30 for poses. Winning moves you to
   the next round and restocks the shop.
5. **Prize wheel** (🎡): after every show your dog spins a wheel for its
   cash prize. Slices are multiples of the round prize (`$1,000 × round`):
   - 1st place: 1× to 3× (never less than the round prize, 3× is the jackpot)
   - 2nd place: 0.1× to 0.75×
   - 3rd place: 0.05× to 0.4×
   - 4th place: 0.02× to 0.2×

   The result is rolled and saved before the wheel starts turning, so
   leaving mid-spin never loses the money.
6. **Dogs** (🐶): 14 breeds to collect, from Pug up to Galaxy, Unicorn and
   Golden Gem pups. Each dog levels up on its own.
7. **Shop** (🛍️): spend prize money on six rotating items.
