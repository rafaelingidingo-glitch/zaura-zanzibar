#!/bin/bash
# ZAURA ZANZIBAR — placeholder photography generator (replaceable with client-supplied images)
set -u
DIR="/home/z/my-project/public/images"
mkdir -p "$DIR"

STYLE="Editorial luxury hospitality photography, warm ivory walls, champagne and sand beige tones, dark charcoal wood accents, Swahili-Zanzibar coastal elegance, natural textures, rattan and brass details, soft natural light, calm serene mood, high quality, detailed, photorealistic, no people, no text, no watermark"

gen() {
  name="$1"; size="$2"; prompt="$3"
  out="$DIR/$name.png"
  if [ -s "$out" ]; then echo "SKIP $name (exists)"; return; fi
  for i in 1 2 3; do
    if z-ai image -p "$prompt" -o "$out" -s "$size" >/dev/null 2>&1 && [ -s "$out" ]; then
      echo "OK   $name"; return
    fi
    echo "RETRY $name (attempt $i)"; sleep 3
  done
  echo "FAIL $name"
}

gen "hero-1" "1344x768" "Wide cinematic view of an elegant boutique apartment residence on the Zanzibar coast at golden hour, contemporary Swahili architecture with carved wooden screens, arched doorways and coral stone walls, swaying palm trees, warm ivory and champagne tones, $STYLE"
gen "hero-2" "1344x768" "Sophisticated open-plan apartment living room opening through a large arched doorway onto a terrace with Indian Ocean view, ivory linen sofas, rattan armchairs, dark charcoal wood beams, brass lanterns, $STYLE"
gen "hero-3" "1344x768" "Private apartment terrace at dusk in Zanzibar with glowing brass lanterns, carved wooden screens, comfortable loungers, glimpse of the sea between palms, deep blue evening sky with warm golden light, $STYLE"
gen "intro-door" "864x1152" "Close-up of an intricately carved antique Zanzibar wooden door with brass studs, soft afternoon shadows on ivory wall, warm champagne light, $STYLE"
gen "cat-studio" "1344x768" "Bright modern studio apartment interior in Zanzibar with king bed dressed in white linen, compact elegant kitchenette with wooden cabinetry, woven pendant light, tropical plants, arched window with garden view, $STYLE"
gen "cat-onebedroom" "1344x768" "Elegant one bedroom apartment bedroom in Zanzibar with four-poster bed and flowing white canopy, crisp linen bedding, champagne throw, wooden shutters opening to palm garden, $STYLE"
gen "cat-twobedroom" "1344x768" "Spacious two bedroom apartment living and dining area in Zanzibar, contemporary Swahili style, ivory sofas with sand beige cushions, dark charcoal dining table, carved wooden wall panel, large windows with soft daylight, $STYLE"
gen "exp-stonetown" "1344x768" "Historic Stone Town Zanzibar street at golden hour with ornately carved wooden balconies and coral stone walls, warm sunlight, cinematic travel editorial photography, no people, no text"
gen "exp-beach" "1344x768" "Pristine white sand beach in Zanzibar with traditional wooden dhow sailboat on turquoise water, gentle waves, palm shadow on sand, cinematic travel editorial photography, no people, no text"
gen "exp-spices" "1344x768" "Zanzibar spice market display with woven baskets of colorful spices, cinnamon sticks, star anise, dried chilies, nutmeg, warm rustic lighting, editorial food photography, no people, no text"
gen "exp-dhow" "1344x768" "Traditional Zanzibar dhow sailing boat silhouette gliding on calm Indian Ocean at sunset, deep orange sky, reflections on water, cinematic travel editorial photography, no people, no text"
gen "gal-living" "1152x864" "Refined apartment living space with curved ivory sofa, rattan lounge chairs, arched niche with brass lamp, woven jute rug, soft shadows, $STYLE"
gen "gal-bedroom" "1152x864" "Serene bedroom with crisp white linen bed, delicate mosquito net canopy, wooden shutters, sand beige throw, brass reading lamp, $STYLE"
gen "gal-bathroom" "1152x864" "Elegant bathroom with polished brass fixtures, rainfall shower, carved stone wash basin, warm ivory microcement walls, folded white towels, tropical plant, $STYLE"
gen "gal-kitchen" "1152x864" "Contemporary kitchenette with dark charcoal lower cabinets, light stone countertop, brass tap, open wooden shelving with ceramics, woven bar stools, $STYLE"
gen "gal-exterior" "1152x864" "Tranquil apartment courtyard in Zanzibar with coral stone walls, tall palms, brass lanterns, carved wooden bench, dappled sunlight, $STYLE"
gen "gal-detail" "768x1344" "Interior detail vignette of woven rattan texture, champagne linen throw, brass table lamp and ceramic vase on dark wooden side table, $STYLE"

echo "ALL DONE"
