use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, symbol_short, Vec};
use crate::common::storage as s;
use crate::common::events as e;

// ---- Data Types ----

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Badge {
    pub id: u64,
    pub name: String,
    pub description: String,
    pub image_uri: String,
    pub tier: u32, // 1=Bronze, 2=Silver, 3=Gold, 4=Platinum
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct BadgeClaim {
    pub badge_id: u64,
    pub claimed_ledger: u32,
}

// ---- Storage Keys ----

const KEY_BADGE_COUNT: Symbol = symbol_short!("BADGE_CT");
const KEY_BADGE: Symbol = symbol_short!("BADGE");
const KEY_USER_BADGES: Symbol = symbol_short!("USR_BADG");

#[contract]
pub struct DripBadge;

// ---- Implementation ----

#[contractimpl]
impl DripBadge {
    /// Initialize. Only admin.
    pub fn initialize_badge(env: Env, admin: Address) {
        if env.storage().persistent().has(&s::KEY_ADMIN) {
            panic!("Already initialized");
        }
        admin.require_auth();

        s::set_persistent(&env, &s::KEY_ADMIN, &admin);
        s::set_persistent(&env, &KEY_BADGE_COUNT, &0u64);

        e::publish(&env, (symbol_short!("bdg_init"), &admin), 0u64);
    }

    /// Create a new badge definition. Only admin.
    pub fn create_badge(
        env: Env,
        admin: Address,
        name: String,
        description: String,
        image_uri: String,
        tier: u32,
    ) -> u64 {
        let stored_admin: Address = s::get_persistent(
            &env, &s::KEY_ADMIN,
            Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        );
        if admin != stored_admin {
            panic!("Only admin");
        }
        admin.require_auth();

        let mut count: u64 = s::get_persistent(&env, &KEY_BADGE_COUNT, 0u64);
        count += 1;
        s::set_persistent(&env, &KEY_BADGE_COUNT, &count);

        let badge = Badge {
            id: count,
            name: name.clone(),
            description,
            image_uri,
            tier,
        };

        let key = (KEY_BADGE, count);
        env.storage().persistent().set(&key, &badge);

        e::publish(&env, (symbol_short!("bdg_creat"), &admin, count), name);
        count
    }

    /// Claim a badge for a user.
    pub fn claim_badge(env: Env, user: Address, badge_id: u64) {
        user.require_auth();

        // Check badge exists
        let badge_key = (KEY_BADGE, badge_id);
        if !env.storage().persistent().has(&badge_key) {
            panic!("Badge does not exist");
        }

        // Check not already claimed
        let claim_key = (KEY_USER_BADGES, user.clone(), badge_id);
        if env.storage().persistent().has(&claim_key) {
            panic!("Badge already claimed");
        }

        let claim = BadgeClaim {
            badge_id,
            claimed_ledger: env.ledger().sequence(),
        };
        env.storage().persistent().set(&claim_key, &claim);

        e::publish(&env, (e::EVENT_BADGE_CLAIM, &user, badge_id), env.ledger().sequence());
    }

    /// Check if a user has claimed a specific badge.
    pub fn has_badge(env: Env, user: Address, badge_id: u64) -> bool {
        let key = (KEY_USER_BADGES, user, badge_id);
        env.storage().persistent().has(&key)
    }

    /// Get a user's claimed badge IDs.
    pub fn get_user_badges(env: Env, user: Address) -> Vec<u64> {
        let mut badges = Vec::new(&env);
        let count: u64 = s::get_persistent(&env, &KEY_BADGE_COUNT, 0u64);

        for i in 1..=count {
            let key = (KEY_USER_BADGES, user.clone(), i);
            if env.storage().persistent().has(&key) {
                badges.push_back(i);
            }
        }
        badges
    }

    /// Grant a badge directly (admin only, no user auth required).
    pub fn grant_badge(env: Env, admin: Address, user: Address, badge_id: u64) {
        let stored_admin: Address = s::get_persistent(
            &env, &s::KEY_ADMIN,
            Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        );
        if admin != stored_admin {
            panic!("Only admin");
        }
        admin.require_auth();

        let claim_key = (KEY_USER_BADGES, user.clone(), badge_id);
        if env.storage().persistent().has(&claim_key) {
            panic!("Badge already claimed");
        }

        let claim = BadgeClaim {
            badge_id,
            claimed_ledger: env.ledger().sequence(),
        };
        env.storage().persistent().set(&claim_key, &claim);

        e::publish(&env, (e::EVENT_BADGE_CLAIM, &user, badge_id), env.ledger().sequence());
    }

    // ---- Getters ----

    pub fn get_badge(env: Env, badge_id: u64) -> Option<Badge> {
        let key = (KEY_BADGE, badge_id);
        env.storage().persistent().get(&key)
    }

    pub fn get_badge_count(env: Env) -> u64 {
        s::get_persistent(&env, &KEY_BADGE_COUNT, 0u64)
    }

    pub fn get_claim(env: Env, user: Address, badge_id: u64) -> Option<BadgeClaim> {
        let key = (KEY_USER_BADGES, user, badge_id);
        env.storage().persistent().get(&key)
    }

    pub fn get_admin(env: Env) -> Address {
        s::get_persistent(
            &env, &s::KEY_ADMIN,
            Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        )
    }
}

// ---- Tests ----

#[cfg(test)]
mod badge_test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_create_and_claim_badge() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::random(&env);
        let user = Address::random(&env);

        let contract_id = env.register(DripBadge, ());
        let client = DripBadgeClient::new(&env, &contract_id);

        client.initialize(&admin);

        // Create badge
        let id = client.create_badge(
            &admin,
            &String::from_str(&env, "Early Dripper"),
            &String::from_str(&env, "First 100 users"),
            &String::from_str(&env, "ipfs://badge1"),
            &3u32,
        );
        assert_eq!(id, 1);

        let badge = client.get_badge(&1).unwrap();
        assert_eq!(badge.name, String::from_str(&env, "Early Dripper"));
        assert_eq!(badge.tier, 3u32);

        // Claim
        client.claim_badge(&user, &1);
        assert!(client.has_badge(user.clone(), 1));
        assert!(!client.has_badge(user.clone(), 2));
    }

    #[test]
    fn test_grant_badge() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::random(&env);
        let user = Address::random(&env);

        let contract_id = env.register(DripBadge, ());
        let client = DripBadgeClient::new(&env, &contract_id);

        client.initialize(&admin);

        client.create_badge(
            &admin,
            &String::from_str(&env, "OG"),
            &String::from_str(&env, "Original Gangster"),
            &String::from_str(&env, "ipfs://og"),
            &4u32,
        );

        client.grant_badge(&admin, &user, &1);

        assert!(client.has_badge(user.clone(), 1));

        let user_badges = client.get_user_badges(user);
        assert_eq!(user_badges.len(), 1);
    }

    #[test]
    fn test_duplicate_claim_prevented() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::random(&env);
        let user = Address::random(&env);

        let contract_id = env.register(DripBadge, ());
        let client = DripBadgeClient::new(&env, &contract_id);

        client.initialize(&admin);
        client.create_badge(
            &admin, &String::from_str(&env, "B"), &String::from_str(&env, "D"), &String::from_str(&env, ""), &1u32,
        );

        client.claim_badge(&user, &1);

        // Second claim should panic
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.claim_badge(&user, &1);
        }));
        assert!(result.is_err());
    }
}
// Badge tiers: Bronze (10 stakes) → Silver (50) → Gold (200) → Platinum (1000)

