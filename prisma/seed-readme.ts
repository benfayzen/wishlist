import { mkdirSync, existsSync, writeFileSync, openSync, closeSync, cpSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "../src/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/server/password";
import sharp from "sharp";

// Never use DATABASE_URL here: documentation fixtures have their own local database.
const root = fileURLToPath(new URL("../", import.meta.url));
const runtime = resolve(root, "data/readme-demo");
const database = resolve(runtime, "wishlist.db");
mkdirSync(resolve(runtime, "uploads"), { recursive: true });
cpSync(resolve(root, "templates"), resolve(runtime, "templates"), { recursive: true });
closeSync(openSync(database, "a"));
const migration = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: `file:${database}` },
    stdio: "inherit",
    shell: process.platform === "win32"
});
if (migration.status !== 0) throw new Error("Could not initialize the documentation database.");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${database}` }) });
const prefix = "readme-";
const password = "SouthPark2026!";
const people = [
    ["stan", "Stan Marsh", "https://upload.wikimedia.org/wikipedia/en/a/a7/StanMarsh.png"],
    ["randy", "Randy Marsh", "https://southpark.wiki.gg/images/Randy_transparent_cockmagic.png"],
    ["sharon", "Sharon Marsh", "https://southpark.wiki.gg/images/Sharon_Marsh.png"],
    ["shelly", "Shelly Marsh", "https://southpark.wiki.gg/images/Shelly.png"],
    ["kyle", "Kyle Broflovski", "https://upload.wikimedia.org/wikipedia/en/2/25/KyleBroflovski.png"],
    ["kenny", "Kenny McCormick", "https://upload.wikimedia.org/wikipedia/en/6/6f/KennyMcCormick.png"],
    ["eric", "Eric Cartman", "https://upload.wikimedia.org/wikipedia/en/7/77/EricCartman.png"]
] as const;
const groups = [
    { key: "family", name: "Marsh Family", members: ["stan", "randy", "sharon", "shelly"], manager: "sharon" },
    { key: "friends", name: "South Park Friends", members: ["stan", "kyle", "kenny", "eric"], manager: "stan" }
];
// Item artwork comes from the South Park Archives. Each file is fitted to a uniform
// 4:3 card image and cached locally, so captures do not depend on remote image loading.
// "contain" keeps cut-out artwork whole on a tinted backdrop; "cover" crops scenes.
const artwork: Record<string, [file: string, fit: "contain" | "cover", background?: string]> = {
    gamesphere: ["Gamesphere_Front2.png", "contain", "#e3f1e6"],
    poofs: ["CheesyPoofs.png", "contain", "#fff3d6"],
    chinpokomon: ["StegmataChinpokomon.png", "contain", "#e2eef0"],
    clyde: ["Clyde-frog.png", "contain", "#e6f0dc"],
    stick: ["Icon_item_the_stick_of_truth.png", "contain", "#efe6dc"],
    coon: ["The-coon.png", "contain", "#ece8f2"],
    mrhat: ["MrHatTransparent.png", "contain", "#f3e6ee"],
    terrance: ["Terrance.transparent.png", "contain", "#f6e3e3"],
    snacky: ["SnackyCakesLogo.png", "contain", "#fdf0d8"],
    mrkitty: ["MrKitty.png", "contain", "#e8e8ef"],
    sparky: ["Sparky.png", "contain", "#efe8e1"],
    lorde: ["Lorde.png", "contain", "#ede6f3"],
    moop: ["Moop.png", "contain", "#fdf2dc"],
    sot: ["SPSOT.jpeg", "cover"],
    fbw: ["SPFBW_Promo_Image_1.jpg", "cover"],
    casabonita: ["Casa_Bonita_location.png", "cover"],
    harbucks: ["Gnomes33.png", "cover"],
    tweek: ["Tweekbroscoffee.png", "cover"],
    tegridy: ["Tegridy_Burger_1.png", "cover"],
    citywok: ["City_wok_1.png", "cover"],
    whistlin: ["WhistlinWillys.jpg", "cover"],
    starks: ["Starks_pond_1.png", "cover"]
};
type Wish = [name: string, price: number, photo: string, note: string];
const wish = {
    gamesphere: ["Okama GameSphere", 29900, "gamesphere", "The one with the green glow. Totally worth the wait."],
    sot: [
        "The Stick of Truth (video game)",
        2999,
        "sot",
        "For our next quest. Whoever controls the stick controls the universe!"
    ],
    fbw: ["The Fractured But Whole (video game)", 3999, "fbw", "The superhero sequel. Coon and Friends, assemble!"],
    poofs: ["Cheesy Poofs party pack", 1200, "poofs", "Snacks for game night. There can never be too many!"],
    chinpokomon: ["Chinpokomon figure", 1999, "chinpokomon", "Any one we don't have yet. Gotta buy 'em all!"],
    clyde: ["Clyde Frog plush", 2499, "clyde", "The classic stuffed frog. Soft, green and always a good listener."],
    stick: ["Stick of Truth replica", 3999, "stick", "A handcrafted replica for the kingdom of Kupa Keep."],
    coon: ["The Coon costume", 4999, "coon", "Mask, cape and claws. Size small, please."],
    mrhat: ["Mr. Hat hand puppet", 1499, "mrhat", "For puppet shows in class. Must be the striped hat."],
    terrance: ["Terrance & Phillip box set", 3499, "terrance", "Every season of the best show from Canada."],
    snacky: ["Snacky Cakes variety box", 999, "snacky", "Assorted flavors to share. Not the sugar-free ones."],
    sparky: ["New toys for Sparky", 1999, "sparky", "Squeaky toys and a big chew bone for our dog."],
    lorde: ["Lorde vinyl collection", 3499, "lorde", "For research purposes. Please don't ask."],
    moop: ["Practice drum kit", 14900, "moop", "So the band can finally practice in the garage."],
    casabonita: ["Casa Bonita dinner for four", 8000, "casabonita", "Cliff divers, sopapillas and Black Bart's Cave."],
    harbucks: ["Harbucks coffee gift card", 2500, "harbucks", "For quiet mornings with a latte."],
    tweek: ["Tweek Bros. coffee beans", 1600, "tweek", "Locally roasted. The decaf, please."],
    tegridy: ["Tegridy Burger gift card", 2500, "tegridy", "Burgers made with a whole lot of tegridy."],
    citywok: ["City Wok takeout voucher", 3000, "citywok", "Orange chicken and spring rolls for a night off."],
    whistlin: ["Whistlin' Willy's pizza night", 4500, "whistlin", "Pizza and arcade tokens for everyone."],
    starks: ["Skating day at Stark's Pond", 3000, "starks", "Rink passes and hot cocoa for the whole gang."]
} satisfies Record<string, Wish>;
const lists: {
    key: string;
    owner: string;
    groups: string[];
    name: string;
    icon: string;
    color: string;
    wishes: Wish[];
    description: string;
    pending?: boolean;
    public?: boolean;
    shared?: boolean;
    extraClaims?: [index: number, claimer: string, quantity: number][];
}[] = [
    {
        key: "stan-birthday",
        owner: "stan",
        // Shared with both groups: family and friends see the same wishes and reservations.
        groups: ["family", "friends"],
        name: "Stan's Birthday",
        icon: "gift",
        color: "#377aa2",
        wishes: [wish.gamesphere, wish.sot, wish.sparky, wish.terrance],
        description: "A few ideas for my birthday. Thanks for making it special!",
        pending: true,
        extraClaims: [[3, "kyle", 1]]
    },
    {
        key: "stan-winter",
        owner: "stan",
        groups: ["family"],
        name: "Winter Adventures",
        icon: "snow",
        color: "#367c75",
        wishes: [wish.starks, wish.moop, wish.stick, wish.poofs],
        description: "Ready for snowy days in the Colorado mountains."
    },
    {
        key: "randy-hobbies",
        owner: "randy",
        groups: ["family"],
        name: "Randy's Weekend Projects",
        icon: "hammer",
        color: "#a66536",
        wishes: [wish.lorde, wish.tegridy, wish.citywok, wish.whistlin],
        description: "Everything I need for my next great idea. This time, it'll work!"
    },
    {
        key: "sharon-home",
        owner: "sharon",
        groups: ["family"],
        name: "Sharon's Cozy Corner",
        icon: "cafe",
        color: "#997449",
        wishes: [wish.tweek, wish.harbucks, wish.casabonita, wish.snacky],
        description: "Good coffee, a nice dinner out and a little peace and quiet.",
        public: true
    },
    {
        key: "shelly-music",
        owner: "shelly",
        groups: ["family"],
        name: "Shelly's Music & More",
        icon: "musical-notes",
        color: "#a3487b",
        wishes: [wish.moop, wish.lorde, wish.harbucks, wish.citywok],
        description: "Music, coffee and a few things for my room."
    },
    {
        key: "family-holidays",
        owner: "sharon",
        groups: ["family"],
        name: "Marsh Family Holidays",
        icon: "sparkles",
        color: "#487653",
        wishes: [wish.casabonita, wish.whistlin, wish.tweek, wish.snacky],
        description: "Let's make the holidays special. Pick something to bring or help with!",
        shared: true
    },
    {
        key: "stan-games",
        owner: "stan",
        groups: ["friends"],
        name: "Stan's Game Night",
        icon: "game-controller",
        color: "#6574ba",
        wishes: [wish.fbw, wish.sot, wish.chinpokomon, wish.poofs],
        description: "New adventures for the whole party. Who's ready to play?",
        pending: true
    },
    {
        key: "kyle-books",
        owner: "kyle",
        groups: ["friends"],
        name: "Kyle's Books & Games",
        icon: "book",
        color: "#43895c",
        wishes: [wish.terrance, wish.fbw, wish.stick, wish.chinpokomon],
        description: "Good stories, clever games and something new to learn."
    },
    {
        key: "kenny-outdoor",
        owner: "kenny",
        groups: ["friends"],
        name: "Kenny's Adventure Kit",
        icon: "compass",
        color: "#b8642b",
        wishes: [wish.stick, wish.fbw, wish.whistlin, wish.poofs],
        description: "A few essentials for our next big adventure."
    },
    {
        key: "eric-games",
        owner: "eric",
        groups: ["friends"],
        name: "Cartman's Ultimate Wishlist",
        icon: "trophy",
        color: "#b64749",
        wishes: [wish.gamesphere, wish.coon, wish.clyde, wish.poofs],
        description: "Only the very best. You guys know what to do."
    },
    {
        key: "friends-movie",
        owner: "stan",
        groups: ["friends"],
        name: "Movie Night with the Guys",
        icon: "film",
        color: "#956093",
        wishes: [wish.terrance, wish.poofs, wish.snacky, wish.citywok],
        description: "Bring a game, grab a snack and settle in for movie night.",
        shared: true
    }
];
// A claim by a signed-in account (user key) or by a visitor without an account (guest name).
type RegistryClaim = { by: string; guest?: boolean; quantity: number; purchased?: boolean };
const registries: {
    key: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    creator: string;
    managers: string[];
    wishes: [wish: Wish, quantity: number, claims: RegistryClaim[]][];
}[] = [
    {
        key: "toy-drive",
        name: "South Park Elementary Toy Drive",
        icon: "heart",
        color: "#c2504a",
        description:
            "Help us fill the school gym with gifts for every kid in town. Anyone with the link can reserve a gift, no account needed.",
        creator: "sharon",
        // Managers come from different groups; the registry itself belongs to none.
        managers: ["sharon", "stan", "kyle"],
        wishes: [
            [
                wish.clyde,
                20,
                [
                    { by: "randy", quantity: 4, purchased: true },
                    { by: "kenny", quantity: 2 }
                ]
            ],
            [
                wish.chinpokomon,
                30,
                [
                    { by: "eric", quantity: 6 },
                    { by: "Mr. Mackey", guest: true, quantity: 10 }
                ]
            ],
            [wish.mrhat, 5, [{ by: "Mr. Mackey", guest: true, quantity: 5, purchased: true }]],
            [
                ["Mr. Kitty plush", 1999, "mrkitty", "Cuddly cats for the reading corner."],
                10,
                [{ by: "shelly", quantity: 3 }]
            ],
            [wish.snacky, 12, []]
        ]
    }
];

async function download(url: string, filename: string) {
    const path = resolve(runtime, "uploads", filename);
    if (existsSync(path)) return;
    writeFileSync(path, await fetchImage(url));
}
async function fetchImage(url: string) {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: { "User-Agent": "Wishlist-Documentation/1.0" }
    });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
        throw new Error(`Could not download demo image: ${url} (${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
}
async function prepareArtwork(key: string, [file, fit, background = "#f2eee9"]: (typeof artwork)[string]) {
    const path = resolve(runtime, "uploads", `readme-${key}.jpg`);
    if (existsSync(path)) return;
    const source = await fetchImage(`https://southpark.wiki.gg/images/${encodeURIComponent(file)}`);
    const image =
        fit === "cover"
            ? sharp(source).resize(800, 600, { fit: "cover" })
            : sharp({ create: { width: 800, height: 600, channels: 3, background } }).composite([
                  {
                      input: await sharp(source).trim().resize(560, 480, { fit: "inside" }).png().toBuffer()
                  }
              ]);
    await image.flatten({ background }).jpeg({ quality: 86 }).toFile(path);
}
async function main() {
    await Promise.all(people.map(([key, , url]) => download(url, `readme-${key}.png`)));
    for (const [key, definition] of Object.entries(artwork)) await prepareArtwork(key, definition);
    const hashedPassword = await hashPassword(password);
    await prisma.$transaction(
        async (tx) => {
            for (const [id, name] of [
                [1, "USER"],
                [2, "ADMIN"],
                [3, "GROUP_MANAGER"]
            ] as const) {
                await tx.role.upsert({ where: { id }, create: { id, name }, update: {} });
            }
            for (const [key, name] of people) {
                await tx.user.upsert({
                    where: { id: `${prefix}${key}` },
                    create: {
                        id: `${prefix}${key}`,
                        username: `demo.${key}`,
                        name,
                        email: `${key}@southpark.example`,
                        picture: `readme-${key}.png`,
                        hashedPassword,
                        preferredLanguage: "en"
                    },
                    update: {}
                });
            }
            const settings = {
                allowPublicLists: "true",
                "suggestions.enable": "true",
                "suggestions.method": "approval",
                "claims.showName": "true"
            };
            // Registries use the installation-wide settings; group lists use their group's settings.
            for (const groupId of ["global", ...groups.map(({ key }) => `${prefix}${key}`)]) {
                for (const [key, value] of Object.entries(settings)) {
                    await tx.systemConfig.upsert({
                        where: { key_groupId: { key, groupId } },
                        create: { key, groupId, value },
                        update: {}
                    });
                }
            }
            for (const group of groups) {
                const groupId = `${prefix}${group.key}`;
                await tx.group.upsert({
                    where: { id: groupId },
                    create: { id: groupId, name: group.name },
                    update: {}
                });
                for (const key of group.members) {
                    const userId = `${prefix}${key}`;
                    const hasActiveGroup = await tx.userGroupMembership.findFirst({ where: { userId, active: true } });
                    await tx.userGroupMembership.upsert({
                        where: { id: `${groupId}-${key}` },
                        create: {
                            id: `${groupId}-${key}`,
                            groupId,
                            userId,
                            active: !hasActiveGroup,
                            roleId: key === group.manager ? 3 : 1
                        },
                        update: {}
                    });
                }
            }
            for (const definition of lists) {
                const listId = `${prefix}${definition.key}`;
                const groupIds = definition.groups.map((key) => `${prefix}${key}`);
                if (await tx.list.findUnique({ where: { id: listId } })) {
                    for (const groupId of groupIds) {
                        await tx.listGroupShare.upsert({
                            where: { listId_groupId: { listId, groupId } },
                            create: { listId, groupId },
                            update: {}
                        });
                    }
                    continue;
                }
                const ownerId = `${prefix}${definition.owner}`;
                const members = groups
                    .find((g) => g.key === definition.groups[0])!
                    .members.filter((key) => key !== definition.owner);
                // Stan has both pending and purchased gifts in My Claims; owners keep their surprises hidden.
                const claimer = definition.owner === "stan" ? members[0] : "stan";
                await tx.list.create({
                    data: {
                        id: listId,
                        name: definition.name,
                        ownerId,
                        groupId: groupIds[0],
                        groupShares: { create: groupIds.map((groupId) => ({ groupId })) },
                        icon: definition.icon,
                        iconColor: definition.color,
                        description: definition.description,
                        public: definition.public ?? false,
                        notForMe: definition.shared ?? false,
                        allowSelfClaims: definition.shared ?? false
                    }
                });
                for (const [index, [name, value, photo, note]] of definition.wishes.entries()) {
                    const item = await tx.item.create({
                        data: {
                            name,
                            note,
                            userId: ownerId,
                            createdById: ownerId,
                            mostWanted: index === 0,
                            quantity: index === 3 ? 4 : 1,
                            imageUrl: `readme-${photo}.jpg`,
                            itemPriceId: (await tx.itemPrice.create({ data: { value, currency: "USD" } })).id,
                            lists: { create: { listId, addedById: ownerId, displayOrder: index } }
                        }
                    });
                    if (index > 0)
                        await tx.itemClaim.create({
                            data: {
                                itemId: item.id,
                                listId,
                                claimedById: `${prefix}${claimer}`,
                                quantity: index === 3 ? 2 : 1,
                                purchased: index === 2
                            }
                        });
                    for (const [claimIndex, extraClaimer, quantity] of definition.extraClaims ?? []) {
                        if (claimIndex !== index) continue;
                        await tx.itemClaim.create({
                            data: { itemId: item.id, listId, claimedById: `${prefix}${extraClaimer}`, quantity }
                        });
                    }
                }
                if (definition.pending) {
                    await tx.item.create({
                        data: {
                            name: "Chinpokomon starter set",
                            note: "Saw this at the mall. Everyone at school has one!",
                            quantity: 1,
                            userId: ownerId,
                            createdById: `${prefix}${members[0]}`,
                            imageUrl: "readme-chinpokomon.jpg",
                            lists: {
                                create: {
                                    listId,
                                    addedById: `${prefix}${members[0]}`,
                                    approved: false,
                                    displayOrder: 4
                                }
                            }
                        }
                    });
                }
                if (definition.shared)
                    await tx.listManager.create({
                        data: { listId, userId: `${prefix}${definition.groups[0] === "family" ? "randy" : "kyle"}` }
                    });
            }
            for (const definition of registries) {
                const listId = `${prefix}${definition.key}`;
                if (await tx.list.findUnique({ where: { id: listId } })) continue;
                const creatorId = `${prefix}${definition.creator}`;
                // Mirrors createRegistry(): no owner, no group shares, always public.
                await tx.list.create({
                    data: {
                        id: listId,
                        name: definition.name,
                        ownerId: null,
                        listMode: "registry",
                        groupId: "global",
                        public: true,
                        hideOwner: true,
                        notForMe: true,
                        icon: definition.icon,
                        iconColor: definition.color,
                        description: definition.description,
                        managers: { create: definition.managers.map((key) => ({ userId: `${prefix}${key}` })) }
                    }
                });
                for (const [index, [[name, value, photo, note], quantity, claims]] of definition.wishes.entries()) {
                    const item = await tx.item.create({
                        data: {
                            name,
                            note,
                            userId: creatorId,
                            createdById: creatorId,
                            mostWanted: index === 0,
                            quantity,
                            imageUrl: `readme-${photo}.jpg`,
                            itemPriceId: (await tx.itemPrice.create({ data: { value, currency: "USD" } })).id,
                            lists: { create: { listId, addedById: creatorId, displayOrder: index } }
                        }
                    });
                    for (const claim of claims) {
                        const guestId = `${prefix}guest-${claim.by.toLowerCase().replace(/[^a-z]+/g, "-")}`;
                        if (claim.guest)
                            await tx.systemUser.upsert({
                                where: { id: guestId },
                                create: { id: guestId, name: claim.by, username: "counselor@southpark.example" },
                                update: {}
                            });
                        await tx.itemClaim.create({
                            data: {
                                itemId: item.id,
                                listId,
                                quantity: claim.quantity,
                                purchased: claim.purchased ?? false,
                                ...(claim.guest
                                    ? { publicClaimedById: guestId }
                                    : { claimedById: `${prefix}${claim.by}` })
                            }
                        });
                    }
                }
            }
        },
        { timeout: 60000 }
    );
    console.log(`Documentation demo ready: ${database}`);
    console.log(`English accounts: ${people.map(([key]) => `demo.${key}`).join(", ")}`);
    console.log(`Initial demo password: ${password}`);
    console.log("Existing demo edits, passwords and active groups are preserved. Other databases are never accessed.");
}
main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
