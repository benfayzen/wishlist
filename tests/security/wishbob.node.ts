import { test } from "node:test";
import assert from "node:assert/strict";
import {
    parseWishbobHtml,
    parseWishbobPrice,
    parseWishbobUrlInput,
    unwrapProductUrl
} from "../../src/lib/server/wishbob-parser";

test("parseWishbobUrlInput accepts public Wishbob URLs and rejects other hosts", () => {
    assert.equal(parseWishbobUrlInput("https://www.wishbob.com/demo-list")?.href, "https://www.wishbob.com/demo-list");
    assert.equal(parseWishbobUrlInput("wishbob.com/demo-list")?.href, "https://wishbob.com/demo-list");
    assert.equal(parseWishbobUrlInput("https://www.wishbob.com/"), null);
    assert.equal(parseWishbobUrlInput("https://example.com/demo-list"), null);
    assert.equal(parseWishbobUrlInput("https://wishbob.com.example.com/demo-list"), null);
    assert.equal(parseWishbobUrlInput("javascript:alert(1)"), null);
    assert.equal(parseWishbobUrlInput(""), null);
});

test("unwrapProductUrl unwraps affiliate redirects and strips Wishbob Amazon tags", () => {
    assert.equal(
        unwrapProductUrl(
            "https://go.skimresources.com?id=12345&amp;xs=1&amp;url=https%3A%2F%2Fshop.example.com%2Fitem%3Fcolor%3Dred"
        ),
        "https://shop.example.com/item?color=red"
    );
    assert.equal(
        unwrapProductUrl("http://redirect.viglink.com?u=https%3A%2F%2Fstore.example.de%2Fp%2F42&amp;key=abc"),
        "https://store.example.de/p/42"
    );
    assert.equal(
        unwrapProductUrl(
            "https://click.linksynergy.com/deeplink?id=abc&amp;mid=1&amp;murl=https%3A%2F%2Fexample.org%2Ftoy"
        ),
        "https://example.org/toy"
    );
    assert.equal(
        unwrapProductUrl("https://www.awin1.com/cread.php?awinmid=1&amp;ued=https%3A%2F%2Fexample.net%2Fbook"),
        "https://example.net/book"
    );
    assert.equal(
        unwrapProductUrl("https://www.amazon.de/dp/B000000000?tag=wunschliste0a-21&amp;linkCode=ogi&amp;th=1"),
        "https://www.amazon.de/dp/B000000000?th=1"
    );
    assert.equal(unwrapProductUrl("javascript:alert(1)"), null);
});

test("parseWishbobPrice parses German, US, and symbol prices into minor units", () => {
    assert.deepEqual(parseWishbobPrice("EUR 7,99"), { value: 799, currency: "EUR", raw: "EUR 7,99" });
    assert.deepEqual(parseWishbobPrice("EUR 1.299,50"), { value: 129950, currency: "EUR", raw: "EUR 1.299,50" });
    assert.deepEqual(parseWishbobPrice("USD 26.99"), { value: 2699, currency: "USD", raw: "USD 26.99" });
    assert.deepEqual(parseWishbobPrice("USD 1,299.95"), { value: 129995, currency: "USD", raw: "USD 1,299.95" });
    assert.deepEqual(parseWishbobPrice("19,99 €"), { value: 1999, currency: "EUR", raw: "19,99 €" });
    assert.deepEqual(parseWishbobPrice("JPY 1500"), { value: 1500, currency: "JPY", raw: "JPY 1500" });
    assert.equal(parseWishbobPrice(""), null);
});

test("parseWishbobHtml extracts open and fulfilled wishes, notes, prices, and images", () => {
    const sampleHtml = `
    <html>
      <head>
        <meta property="og:title" content="Example Birthday List" />
      </head>
      <body>
        <div id="wunsch_101" class="wish-wrapper">
          <div class="wish clearfix" data-wish-id="101" data-fulfilled="0">
            <div class="wish-image-wrapper">
              <a class="js-goto-product" href="https://go.skimresources.com?id=1&amp;url=https%3A%2F%2Fshop.example.com%2Fmug">
                <img class="wish-image" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="https://cdn.example.com/mug.jpg" alt="Mug" />
              </a>
            </div>
            <div class="wish-title">
              <a class="js-goto-product" title="Keramik-Tasse &ndash; Gro&szlig; &amp; Blau" href="https://go.skimresources.com?id=1&amp;url=https%3A%2F%2Fshop.example.com%2Fmug">
                Keramik-Tasse...
              </a>
            </div>
            <p class="wish-description">Bitte in Dunkelblau<br/>Gr&ouml;&szlig;e L</p>
            <p class="wish-price">EUR 14,50</p>
          </div>
        </div>
        <div id="wunsch_102" class="wish-wrapper">
          <div class="wish clearfix wish-fulfilled" data-wish-id="102" data-fulfilled="1">
            <div class="wish-image-wrapper">
              <img class="wish-image" src="/user_uploads/example_thumb.webp" alt="Board Game" />
            </div>
            <div class="wish-title">
              <a class="js-goto-product" title="Already Gifted Board Game" href="https://www.amazon.de/dp/B000000001?tag=wunschliste0a-21">
                Already Gifted Board Game
              </a>
            </div>
            <p class="wish-description"></p>
            <p class="wish-price">EUR 29,99</p>
          </div>
        </div>
        <div id="wunsch_103" class="wish-wrapper">
          <div class="wish clearfix" data-wish-id="103" data-fulfilled="0">
            <div class="wish-image-wrapper">
              <img class="wish-image" src="/assets/img/placeholder.png" alt="Manual Wish" />
            </div>
            <div class="wish-title">Buchgutschein vom lokalen Laden</div>
            <p class="wish-description"></p>
            <p class="wish-price"></p>
          </div>
        </div>
      </body>
    </html>
    `;

    const parsed = parseWishbobHtml(sampleHtml, "https://www.wishbob.com/example-list");
    assert.equal(parsed.listTitle, "Example Birthday List");
    assert.equal(parsed.items.length, 3);

    assert.deepEqual(parsed.items[0], {
        externalId: "101",
        name: "Keramik-Tasse – Groß & Blau",
        url: "https://shop.example.com/mug",
        note: "Bitte in Dunkelblau\nGröße L",
        imageUrl: "https://cdn.example.com/mug.jpg",
        price: { value: 1450, currency: "EUR", raw: "EUR 14,50" },
        fulfilled: false,
        inactive: false,
        mostWanted: false
    });

    assert.deepEqual(parsed.items[1], {
        externalId: "102",
        name: "Already Gifted Board Game",
        url: "https://www.amazon.de/dp/B000000001",
        note: null,
        imageUrl: "https://www.wishbob.com/user_uploads/example_thumb.webp",
        price: { value: 2999, currency: "EUR", raw: "EUR 29,99" },
        fulfilled: true,
        inactive: false,
        mostWanted: false
    });

    assert.deepEqual(parsed.items[2], {
        externalId: "103",
        name: "Buchgutschein vom lokalen Laden",
        url: null,
        note: null,
        imageUrl: null,
        price: null,
        fulfilled: false,
        inactive: false,
        mostWanted: false
    });
});
