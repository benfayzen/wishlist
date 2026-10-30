import { mkdirSync, existsSync, writeFileSync, openSync, closeSync, cpSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "../src/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/server/password";

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
// Product photographs are cached locally so screenshot captures do not depend on remote image loading.
const photos: Record<string, string> = {
    games: "photo-1610890716171-6b1bb98ffd09",
    headphones: "photo-1546435770-a3e426bf472b",
    backpack: "photo-1553062407-98eeb64c6a62",
    books: "photo-1544947950-fa07a98d237f",
    guitar: "photo-1510915361894-db8b60106cb1",
    coffee: "photo-1442512595331-e89e73853f31",
    plant: "photo-1416879595882-3373a0480b5b",
    camera: "photo-1516035069371-29a1b244cc32"
};
type Wish = [name: string, price: number, photo: string, note: string];
const outdoor: Wish[] = [
    ["Adventure backpack", 6995, "backpack", "A sturdy daypack for snowy trails and weekend adventures. Blue, please!"],
    ["Instant camera", 7999, "camera", "For saving the best moments with the guys. Any color is great."],
    ["Trail guide collection", 2495, "books", "New places to explore around Colorado. Paperback preferred."],
    ["Wireless headphones", 5999, "headphones", "Something comfortable for the school bus and road trips."]
];
const gaming: Wish[] = [
    ["Cooperative board game", 3499, "games", "A game we can all play together on a snowy afternoon."],
    ["Over-ear gaming headset", 8999, "headphones", "A comfortable headset with a microphone for our next adventure."],
    ["Fantasy adventure books", 2995, "books", "The next stories for our kingdom. A boxed set would be awesome."],
    ["Game night snacks", 1200, "coffee", "Hot chocolate and treats to share. There can never be too many!"]
];
const home: Wish[] = [
    ["Pour-over coffee set", 4995, "coffee", "For slow weekend mornings. A reusable filter would be lovely."],
    ["A new favorite novel", 2299, "books", "A cozy mystery or a good adventure. Surprise me!"],
    ["Indoor herb garden", 3495, "plant", "Basil, mint and rosemary for the kitchen windowsill."],
    ["Acoustic guitar", 12900, "guitar", "A beginner-friendly guitar for a little more music at home."]
];
const lists = [
    {
        key: "stan-birthday",
        owner: "stan",
        group: "family",
        name: "Stan's Birthday",
        icon: "gift",
        color: "#377aa2",
        wishes: outdoor,
        description: "A few ideas for my birthday. Thanks for making it special!",
        pending: true
    },
    {
        key: "stan-winter",
        owner: "stan",
        group: "family",
        name: "Winter Adventures",
        icon: "snow",
        color: "#367c75",
        wishes: outdoor,
        description: "Ready for snowy days in the Colorado mountains."
    },
    {
        key: "randy-hobbies",
        owner: "randy",
        group: "family",
        name: "Randy's Weekend Projects",
        icon: "hammer",
        color: "#a66536",
        wishes: home,
        description: "Everything I need for my next great idea. This time, it'll work!"
    },
    {
        key: "sharon-home",
        owner: "sharon",
        group: "family",
        name: "Sharon's Cozy Corner",
        icon: "cafe",
        color: "#997449",
        wishes: home,
        description: "Good books, fresh coffee and a little peace and quiet.",
        public: true
    },
    {
        key: "shelly-music",
        owner: "shelly",
        group: "family",
        name: "Shelly's Music & More",
        icon: "musical-notes",
        color: "#a3487b",
        wishes: [home[3], gaming[1], outdoor[1], home[1]],
        description: "Music, books and a few things for my room."
    },
    {
        key: "family-holidays",
        owner: "sharon",
        group: "family",
        name: "Marsh Family Holidays",
        icon: "sparkles",
        color: "#487653",
        wishes: [gaming[0], home[0], home[2], gaming[3]],
        description: "Let's make the holidays special. Pick something to bring or help with!",
        shared: true
    },
    {
        key: "stan-games",
        owner: "stan",
        group: "friends",
        name: "Stan's Game Night",
        icon: "game-controller",
        color: "#6574ba",
        wishes: gaming,
        description: "New adventures for the whole party. Who's ready to play?",
        pending: true
    },
    {
        key: "kyle-books",
        owner: "kyle",
        group: "friends",
        name: "Kyle's Books & Games",
        icon: "book",
        color: "#43895c",
        wishes: [home[1], gaming[0], outdoor[1], gaming[2]],
        description: "Good stories, clever games and something new to learn."
    },
    {
        key: "kenny-outdoor",
        owner: "kenny",
        group: "friends",
        name: "Kenny's Adventure Kit",
        icon: "compass",
        color: "#b8642b",
        wishes: outdoor,
        description: "A few essentials for our next big adventure."
    },
    {
        key: "eric-games",
        owner: "eric",
        group: "friends",
        name: "Cartman's Ultimate Wishlist",
        icon: "trophy",
        color: "#b64749",
        wishes: gaming,
        description: "Only the very best. You guys know what to do."
    },
    {
        key: "friends-movie",
        owner: "stan",
        group: "friends",
        name: "Movie Night with the Guys",
        icon: "film",
        color: "#956093",
        wishes: [gaming[0], gaming[1], gaming[3], home[0]],
        description: "Bring a game, grab a snack and settle in for movie night.",
        shared: true
    }
];

async function download(url: string, filename: string) {
    const path = resolve(runtime, "uploads", filename);
    if (existsSync(path)) return;
    const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: { "User-Agent": "Wishlist-Documentation/1.0" }
    });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
        throw new Error(`Could not download demo image: ${url} (${response.status})`);
    }
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
}
async function main() {
    await Promise.all(people.map(([key, , url]) => download(url, `readme-${key}.png`)));
    await Promise.all(
        Object.entries(photos).map(([key, id]) =>
            download(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=85`, `readme-${key}.jpg`)
        )
    );
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
                for (const [key, value] of Object.entries({
                    allowPublicLists: "true",
                    "suggestions.enable": "true",
                    "suggestions.method": "approval",
                    "claims.showName": "true"
                })) {
                    await tx.systemConfig.upsert({
                        where: { key_groupId: { key, groupId } },
                        create: { key, groupId, value },
                        update: {}
                    });
                }
            }
            for (const definition of lists) {
                const listId = `${prefix}${definition.key}`;
                if (await tx.list.findUnique({ where: { id: listId } })) {
                    const groupId = `${prefix}${definition.group}`;
                    await tx.listGroupShare.upsert({
                        where: { listId_groupId: { listId, groupId } },
                        create: { listId, groupId },
                        update: {}
                    });
                    continue;
                }
                const ownerId = `${prefix}${definition.owner}`;
                const members = groups
                    .find((g) => g.key === definition.group)!
                    .members.filter((key) => key !== definition.owner);
                // Stan has both pending and purchased gifts in My Claims; owners keep their surprises hidden.
                const claimer = definition.owner === "stan" ? members[0] : "stan";
                await tx.list.create({
                    data: {
                        id: listId,
                        name: definition.name,
                        ownerId,
                        groupId: `${prefix}${definition.group}`,
                        groupShares: { create: { groupId: `${prefix}${definition.group}` } },
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
                }
                if (definition.pending) {
                    await tx.item.create({
                        data: {
                            name: "A new adventure to share",
                            note: "Thought you might like this for our next game night!",
                            quantity: 1,
                            userId: ownerId,
                            createdById: `${prefix}${members[0]}`,
                            imageUrl: "readme-games.jpg",
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
                        data: { listId, userId: `${prefix}${definition.group === "family" ? "randy" : "kyle"}` }
                    });
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
