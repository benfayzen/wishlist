"""Run with python3 -m unittest discover -s tests/migrations."""
import unittest
from pathlib import Path
import test_list_group_shares

MIGRATION = Path(__file__).resolve().parents[2] / "prisma/migrations/20261030160000_list_level_registry/migration.sql"


class ListLevelRegistryMigration(unittest.TestCase):
    def setUp(self):
        test_list_group_shares.ListGroupSharesMigration.setUp(self)
        self.db.executescript('''
            CREATE TABLE system_config (key TEXT, groupId TEXT, value TEXT);
            INSERT INTO system_config VALUES ('listMode', 'family', 'registry');
            CREATE TABLE list_manager (id TEXT PRIMARY KEY, userId TEXT REFERENCES user(id), listId TEXT REFERENCES list(id) ON DELETE CASCADE);
            INSERT INTO list (id, name, ownerId, groupId, public)
                VALUES ('public-registry', 'Celebration', 'anna', 'family', 1),
                       ('public-wishlist', 'Wishlist', 'anna', 'friends', 1);
            INSERT INTO list_group_share VALUES ('public-registry', 'family'), ('public-registry', 'friends'), ('public-wishlist', 'friends');
            INSERT INTO item_claim VALUES ('registry-reserved', 'public-registry', 1, 1);
        ''')

    def migrate(self):
        self.db.executescript(MIGRATION.read_text())

    def test_registry_detached_with_owner_as_manager_and_claims_preserved(self):
        self.migrate()
        self.assertEqual(self.db.execute("SELECT ownerId, groupId, listMode, public FROM list WHERE id='public-registry'").fetchone(), (None, 'global', 'registry', 1))
        self.assertEqual(self.db.execute("SELECT userId FROM list_manager WHERE listId='public-registry'").fetchall(), [('anna',)])
        self.assertEqual(self.db.execute("SELECT * FROM list_group_share WHERE listId='public-registry'").fetchall(), [])
        self.assertEqual(self.db.execute('SELECT count(*) FROM item_claim').fetchone(), (2,))
        self.assertEqual(self.db.execute('SELECT count(*) FROM list').fetchone(), (3,))
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(), [])

    def test_private_and_standard_public_lists_keep_their_visibility(self):
        self.migrate()
        self.assertEqual(self.db.execute("SELECT ownerId, listMode, public FROM list WHERE id='birthday'").fetchone(), ('anna', 'standard', 0))
        self.assertEqual(self.db.execute("SELECT groupId FROM list_group_share WHERE listId='birthday'").fetchall(), [('family',)])
        self.assertEqual(self.db.execute("SELECT ownerId, listMode, public FROM list WHERE id='public-wishlist'").fetchone(), ('anna', 'standard', 1))

    def test_existing_manager_is_not_duplicated(self):
        self.db.execute("INSERT INTO list_manager VALUES ('existing', 'anna', 'public-registry')")
        self.db.commit()
        self.migrate()
        self.assertEqual(self.db.execute("SELECT id FROM list_manager WHERE listId='public-registry'").fetchall(), [('existing',)])

    def test_global_legacy_mode_is_inherited_but_explicit_standard_wins(self):
        self.db.executescript("DELETE FROM system_config; INSERT INTO system_config VALUES ('listMode', 'global', 'registry'), ('listMode', 'friends', 'standard');")
        self.migrate()
        self.assertEqual(self.db.execute("SELECT listMode FROM list WHERE id='public-registry'").fetchone(), ('registry',))
        self.assertEqual(self.db.execute("SELECT listMode FROM list WHERE id='public-wishlist'").fetchone(), ('standard',))
