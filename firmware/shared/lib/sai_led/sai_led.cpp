#include "sai_led.h"
#include "sai_config.h"

#include <FastLED.h>

static CRGB g_leds[SAI_LED_COUNT];
static bool g_initialized = false;

void sai_led_init() {
    if (g_initialized) return;

    FastLED.addLeds<WS2812B, SAI_LED_PIN, GRB>(g_leds, SAI_LED_COUNT);
    // 16 LEDs at full white ≈ 960 mA — cap at 96/255 to stay within USB-C 5 V budget.
    FastLED.setBrightness(96);
    sai_led_clear();

    g_initialized = true;
}

void sai_led_set_solid(uint8_t r, uint8_t g, uint8_t b) {
    fill_solid(g_leds, SAI_LED_COUNT, CRGB(r, g, b));
}

void sai_led_set_spectrum(const uint8_t* bins, uint8_t count) {
    const uint8_t n = (count < SAI_LED_COUNT) ? count : SAI_LED_COUNT;
    for (uint8_t i = 0; i < n; ++i) {
        const uint8_t hue = (uint16_t)i * 255 / SAI_LED_COUNT;
        g_leds[i] = CHSV(hue, 255, bins[i]);
    }
    for (uint8_t i = n; i < SAI_LED_COUNT; ++i) {
        g_leds[i] = CRGB::Black;
    }
}

void sai_led_show() {
    FastLED.show();
}

void sai_led_clear() {
    fill_solid(g_leds, SAI_LED_COUNT, CRGB::Black);
    FastLED.show();
}
