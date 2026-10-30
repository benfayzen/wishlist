import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/server/password";

// Deliberately ignore DATABASE_URL: demo accounts belong only in the local preview.
const root = fileURLToPath(new URL("../", import.meta.url));
const database = resolve(root, "data/m3-preview/wishlist.db");
if (!existsSync(database)) throw new Error("Start pnpm preview:native once before loading demo data.");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${database}` }) });
const password = "Wunschliste2026!";
const prefix = "dev-demo-";

const people = [
    ["anna", "Anna Becker"],
    ["ben", "Ben Fischer"],
    ["clara", "Clara Weber"],
    ["david", "David Wagner"],
    ["emma", "Emma Hoffmann"],
    ["felix", "Felix Schneider"]
] as const;

const groupDefinitions = [
    { key: "family", name: "Demo · Familie", members: ["anna", "ben", "clara", "david"], manager: "anna" },
    { key: "friends", name: "Demo · Freundeskreis", members: ["anna", "clara", "emma", "felix"], manager: "clara" },
    { key: "team", name: "Demo · Team", members: ["ben", "david", "emma", "felix"], manager: "emma" }
] as const;

const listDefinitions = [
    {
        key: "anna-birthday",
        owner: "anna",
        group: "family",
        name: "Annas Geburtstag",
        icon: "ion:gift",
        color: "#9B4058"
    },
    {
        key: "ben-kitchen",
        owner: "ben",
        group: "family",
        name: "Bens Küche & Kaffee",
        icon: "ion:cafe",
        color: "#8A5A36"
    },
    {
        key: "clara-books",
        owner: "clara",
        group: "family",
        name: "Claras Leseecke",
        icon: "ion:book",
        color: "#6850A1"
    },
    {
        key: "family-christmas",
        owner: "david",
        group: "family",
        name: "Weihnachten für die Kinder",
        icon: "ion:sparkles",
        color: "#366B49",
        notForMe: true,
        manager: "anna"
    },
    {
        key: "anna-outdoor",
        owner: "anna",
        group: "friends",
        name: "Annas Outdoor-Abenteuer",
        icon: "ion:compass",
        color: "#397568"
    },
    {
        key: "clara-creative",
        owner: "clara",
        group: "friends",
        name: "Claras Kreativstudio",
        icon: "ion:color-palette",
        color: "#A14F7D"
    },
    {
        key: "emma-public",
        owner: "emma",
        group: "friends",
        name: "Emmas Einzug · öffentlich",
        icon: "ion:home",
        color: "#A15E35",
        public: true
    },
    {
        key: "felix-games",
        owner: "felix",
        group: "friends",
        name: "Felix’ Spieleabend",
        icon: "ion:game-controller",
        color: "#4A67A1"
    },
    { key: "ben-desk", owner: "ben", group: "team", name: "Bens Schreibtisch", icon: "ion:desktop", color: "#526E85" },
    {
        key: "david-sport",
        owner: "david",
        group: "team",
        name: "Davids Sport & Freizeit",
        icon: "ion:bicycle",
        color: "#597339"
    },
    {
        key: "team-party",
        owner: "emma",
        group: "team",
        name: "Teamfeier · gemeinsam planen",
        icon: "ion:people",
        color: "#88549B",
        allowSelfClaims: true,
        notForMe: true,
        manager: "felix"
    },
    {
        key: "felix-music",
        owner: "felix",
        group: "team",
        name: "Felix’ Musikzimmer",
        icon: "ion:musical-notes",
        color: "#A34B41"
    }
];

// Each row covers: free, fully reserved, purchased, partial, split, unlimited.
const products: [string, number][] = [
    ["Tagesrucksack 24 Liter", 6990],
    ["Isolierte Trinkflasche", 2990],
    ["Stirnlampe", 3490],
    ["Wandersocken", 1490],
    ["Karabiner", 790],
    ["Energieriegel", 250],
    ["Handkaffeemühle", 7990],
    ["Espressotassen", 2490],
    ["Wasserkessel", 5990],
    ["Vorratsglas", 1290],
    ["Leinenservietten", 890],
    ["Kaffeebohnen", 1250],
    ["Roman: Der kleine Buchladen", 2200],
    ["Leselampe", 3990],
    ["Buchstützen", 2490],
    ["Notizbuch", 1490],
    ["Lesezeichen", 590],
    ["Buchgutschein", 1000],
    ["Holzeisenbahn Starterset", 5990],
    ["Kinderpuzzle", 1490],
    ["Kuscheltier Fuchs", 2490],
    ["Knete", 690],
    ["Buntstifte", 490],
    ["Bastelpapier", 390],
    ["Picknickdecke", 3990],
    ["Trekkingstöcke", 5990],
    ["Campingkocher", 4490],
    ["Emaillebecher", 1290],
    ["Zeltheringe", 390],
    ["Trail-Snacks", 290],
    ["Aquarellkasten", 3490],
    ["Skizzenbuch", 1890],
    ["Keramik-Pinselbecher", 2290],
    ["Aquarellpinsel", 990],
    ["Washi-Tape", 450],
    ["Zeichenpapier", 690],
    ["Tischleuchte", 4990],
    ["Vase aus Keramik", 2990],
    ["Fußmatte", 1990],
    ["Frühstücksteller", 1290],
    ["Wasserglas", 690],
    ["Pflanzengutschein", 1500],
    ["Kooperatives Brettspiel", 3990],
    ["Kartenspiel", 1490],
    ["Würfelturm", 2490],
    ["Spielschalen", 790],
    ["Würfelsets", 590],
    ["Knabbereien", 350],
    ["Monitorständer", 5990],
    ["Schreibtischunterlage", 2990],
    ["Laptop-Ständer", 4490],
    ["Kabelhalter", 690],
    ["Whiteboard-Marker", 490],
    ["Haftnotizen", 290],
    ["Yogamatte", 4990],
    ["Fahrradlicht", 3490],
    ["Sporttasche", 3990],
    ["Trainingsbänder", 990],
    ["Tennisbälle", 590],
    ["Sportgetränke", 250],
    ["Bluetooth-Lautsprecher", 8990],
    ["Lichterkette", 2490],
    ["Quizspiel fürs Team", 1990],
    ["Mehrwegbecher", 490],
    ["Snackschalen", 690],
    ["Getränke für die Feier", 350],
    ["Kopfhörerständer", 2990],
    ["Gitarrengurt", 2490],
    ["Metronom", 3490],
    ["Gitarrensaiten", 1290],
    ["Plektren", 190],
    ["Musikgutschein", 1000]
];

async function main() {
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
            const users: Record<string, string> = {};
            for (const [key, name] of people) {
                const user = await tx.user.upsert({
                    where: { id: `${prefix}user-${key}` },
                    create: {
                        id: `${prefix}user-${key}`,
                        username: `demo.${key}`,
                        name,
                        email: `${key}@wishlist.example`,
                        hashedPassword,
                        preferredLanguage: "de"
                    },
                    update: {}
                });
                users[key] = user.id;
            }
            const preview = await tx.user.findUnique({ where: { username: "preview" } });
            if (preview) users.preview = preview.id;

            const groups: Record<string, string> = {};
            for (const definition of groupDefinitions) {
                const group = await tx.group.upsert({
                    where: { id: `${prefix}group-${definition.key}` },
                    create: { id: `${prefix}group-${definition.key}`, name: definition.name },
                    update: {}
                });
                groups[definition.key] = group.id;
                for (const key of [...definition.members, ...(preview ? ["preview"] : [])]) {
                    // Keep the current active group; new users start in their first demo group.
                    const active = !(await tx.userGroupMembership.findFirst({
                        where: { userId: users[key], active: true }
                    }));
                    await tx.userGroupMembership.upsert({
                        where: { id: `${prefix}member-${definition.key}-${key}` },
                        create: {
                            id: `${prefix}member-${definition.key}-${key}`,
                            userId: users[key],
                            groupId: group.id,
                            active,
                            roleId: key === definition.manager ? 3 : 1
                        },
                        update: {}
                    });
                }
                const config = {
                    allowPublicLists: "true",
                    "suggestions.enable": "true",
                    "suggestions.method": "approval",
                    "claims.showName": "true",
                    "claims.showForOwner": definition.key === "team" ? "true" : "false"
                };
                for (const [key, value] of Object.entries(config)) {
                    await tx.systemConfig.upsert({
                        where: { key_groupId: { key, groupId: group.id } },
                        create: { key, value, groupId: group.id },
                        update: {}
                    });
                }
            }

            for (const [listIndex, definition] of listDefinitions.entries()) {
                const id = `${prefix}list-${definition.key}`;
                // Create a list's scenario once, preserving edits and reservations on later runs.
                if (await tx.list.findUnique({ where: { id } })) continue;
                const ownerId = users[definition.owner];
                await tx.list.create({
                    data: {
                        id,
                        ownerId,
                        groupId: groups[definition.group],
                        groupShares: { create: { groupId: groups[definition.group] } },
                        name: definition.name,
                        icon: definition.icon,
                        iconColor: definition.color,
                        public: definition.public ?? false,
                        notForMe: definition.notForMe ?? false,
                        allowSelfClaims: definition.allowSelfClaims ?? false,
                        description:
                            "Demo zum Testen: freie, reservierte, gekaufte und teilweise reservierte Wünsche sowie mehrere Reservierungen und unbegrenzte Mengen."
                    }
                });
                if (definition.manager) {
                    await tx.listManager.create({ data: { listId: id, userId: users[definition.manager] } });
                }
                const group = groupDefinitions.find((g) => g.key === definition.group)!;
                const claimers = [...(preview ? [preview.id] : []), ...group.members.map((key) => users[key])].filter(
                    (userId) => userId !== ownerId
                );
                for (let index = 0; index < 6; index++) {
                    const [name, value] = products[listIndex * 6 + index];
                    const notes = [
                        "Noch frei – direkt reservieren und wieder freigeben.",
                        "Vollständig reserviert – Reservierung aufheben oder als gekauft markieren.",
                        "Bereits gekauft – Kaufstatus zurücksetzen.",
                        "4 gewünscht, 2 reserviert – weitere Mengen reservieren.",
                        "6 gewünscht – auf mehrere Personen aufgeteilte Reservierungen.",
                        "Unbegrenzte Menge – beliebige Anzahl reservieren."
                    ];
                    const item = await tx.item.create({
                        data: {
                            name,
                            userId: ownerId,
                            createdById: ownerId,
                            quantity: index === 5 ? null : index === 3 ? 4 : index === 4 ? 6 : 1,
                            mostWanted: index === 0,
                            note: notes[index],
                            itemPriceId: (await tx.itemPrice.create({ data: { value, currency: "EUR" } })).id,
                            lists: { create: { listId: id, addedById: ownerId, displayOrder: index } }
                        }
                    });
                    if (index === 0) continue;
                    const selfClaim = definition.allowSelfClaims && index === 1;
                    await tx.itemClaim.create({
                        data: {
                            itemId: item.id,
                            listId: id,
                            claimedById: selfClaim ? ownerId : claimers[0],
                            quantity: index === 3 || index === 5 ? 2 : 1,
                            purchased: index === 2
                        }
                    });
                    if (index === 4) {
                        await tx.itemClaim.create({
                            data: {
                                itemId: item.id,
                                listId: id,
                                claimedById: claimers[1],
                                quantity: 2,
                                purchased: true
                            }
                        });
                    }
                    if (definition.public && index === 5) {
                        const guest = await tx.systemUser.create({
                            data: { name: "Gast · Mia", username: "mia@wishlist.example" }
                        });
                        await tx.itemClaim.create({
                            data: { itemId: item.id, listId: id, publicClaimedById: guest.id, quantity: 3 }
                        });
                    }
                }
                if (definition.key === "anna-birthday" || definition.key === "clara-creative") {
                    await tx.item.create({
                        data: {
                            name: "Geschenkidee · Überraschungsbox",
                            note: "Vorschlag eines anderen Mitglieds – wartet auf Freigabe.",
                            quantity: 1,
                            userId: ownerId,
                            createdById: claimers[1],
                            lists: { create: { listId: id, addedById: claimers[1], approved: false, displayOrder: 6 } }
                        }
                    });
                }
            }

            // One item on two groups' lists, to test reservations across lists.
            const sourceId = `${prefix}list-anna-birthday`;
            const targetId = `${prefix}list-anna-outdoor`;
            const shared = await tx.listItem.findFirst({ where: { listId: sourceId, displayOrder: 1 } });
            if (shared) {
                await tx.listItem.upsert({
                    where: { listId_itemId: { listId: targetId, itemId: shared.itemId } },
                    create: { listId: targetId, itemId: shared.itemId, addedById: users.anna, displayOrder: 6 },
                    update: {}
                });
            }
            await tx.list.upsert({
                where: { id: `${prefix}list-empty` },
                create: {
                    id: `${prefix}list-empty`,
                    name: "Neue Ideen · noch leer",
                    ownerId: users.anna,
                    groupId: groups.family,
                    icon: "ion:bulb",
                    iconColor: "#9B752F"
                },
                update: {}
            });
        },
        { timeout: 60000 }
    );
    console.log(`Demo data loaded into ${database}`);
    console.log(`Accounts: ${people.map(([key]) => `demo.${key}`).join(", ")}`);
    console.log(`Password for newly created demo accounts: ${password}`);
    console.log("Existing data, passwords, active groups and edited demo lists are preserved.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
