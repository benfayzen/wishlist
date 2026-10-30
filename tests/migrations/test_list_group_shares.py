"""Run with python3 -m unittest discover -s tests/migrations."""
import sqlite3
import unittest
from pathlib import Path

MIGRATION = Path(__file__).resolve().parents[2] / "prisma/migrations/20261030120000_list_group_shares/migration.sql"


class ListGroupSharesMigration(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.addCleanup(self.db.close)
        self.db.executescript('''
            PRAGMA foreign_keys = ON;
            CREATE TABLE "group" (id TEXT PRIMARY KEY);
            CREATE TABLE "user" (id TEXT PRIMARY KEY);
            INSERT INTO "user" VALUES ('anna');
            CREATE TABLE "list" (
                id TEXT PRIMARY KEY, name TEXT, ownerId TEXT, groupId TEXT,
                public BOOLEAN DEFAULT false, hideOwner BOOLEAN DEFAULT false,
                allowSelfClaims BOOLEAN DEFAULT false, notForMe BOOLEAN DEFAULT false,
                icon TEXT, iconColor TEXT, description TEXT
            );
            INSERT INTO "group" VALUES ('family'), ('friends');
            INSERT INTO "list" (id, ownerId, groupId) VALUES ('birthday', 'anna', 'family');
            CREATE TABLE item (id INTEGER PRIMARY KEY, name TEXT);
            INSERT INTO item VALUES (1, 'Backpack');
            CREATE TABLE item_claim (id TEXT PRIMARY KEY, listId TEXT REFERENCES list(id) ON DELETE CASCADE, itemId INTEGER REFERENCES item(id), quantity INTEGER);
            INSERT INTO item_claim VALUES ('reserved', 'birthday', 1, 1);
        ''')
        self.db.executescript(MIGRATION.read_text())

    def test_existing_visibility_and_owner_preserved(self):
        self.assertEqual(self.db.execute('SELECT * FROM list_group_share').fetchall(), [('birthday', 'family')])
        self.assertEqual(self.db.execute('SELECT ownerId FROM list').fetchone(), ('anna',))
        self.assertEqual(self.db.execute('SELECT * FROM item_claim').fetchone(), ('reserved', 'birthday', 1, 1))
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(), [])

    def test_multiple_groups_and_unique_pair(self):
        self.db.execute("INSERT INTO list_group_share VALUES ('birthday', 'friends')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO list_group_share VALUES ('birthday', 'friends')")
        self.assertEqual(self.db.execute('SELECT count(*) FROM list_group_share').fetchone(), (2,))

    def test_invalid_group_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO list_group_share VALUES ('birthday', 'missing')")

    def test_removing_shared_group_preserves_list(self):
        self.db.execute("INSERT INTO list_group_share VALUES ('birthday', 'friends')")
        self.db.execute("DELETE FROM \"group\" WHERE id = 'friends'")
        self.assertEqual(self.db.execute('SELECT count(*) FROM list').fetchone(), (1,))
        self.assertEqual(self.db.execute('SELECT * FROM list_group_share').fetchall(), [('birthday', 'family')])

    def test_deleting_list_removes_shares(self):
        self.db.execute("DELETE FROM list WHERE id = 'birthday'")
        self.assertEqual(self.db.execute('SELECT count(*) FROM list_group_share').fetchone(), (0,))

    def test_deleting_original_group_keeps_owner_list_and_reservations(self):
        self.db.execute("INSERT INTO list_group_share VALUES ('birthday', 'friends')")
        self.db.execute("DELETE FROM \"group\" WHERE id = 'family'")
        self.assertEqual(self.db.execute('SELECT ownerId, groupId FROM list').fetchone(), ('anna', 'family'))
        self.assertEqual(self.db.execute('SELECT count(*) FROM item_claim').fetchone(), (1,))
        self.assertEqual(self.db.execute('SELECT groupId FROM list_group_share').fetchone(), ('friends',))

    def test_deleting_owner_removes_list(self):
        self.db.execute("DELETE FROM user WHERE id = 'anna'")
        self.assertEqual(self.db.execute('SELECT count(*) FROM list').fetchone(), (0,))
        self.assertEqual(self.db.execute('SELECT count(*) FROM list_group_share').fetchone(), (0,))
