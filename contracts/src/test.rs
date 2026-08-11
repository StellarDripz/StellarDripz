#![cfg(test)]

// Integration tests for the Counter contract.
// Token, Pool, Governance, and Badge tests live in their respective modules.
// The duplicate token tests that previously existed here were removed (C2/T2)
// — they are maintained in src/token/mod.rs, src/pool/mod.rs, etc.

mod counter_test {
    use soroban_sdk::testutils::Address as _;
    use crate::counter::{StellarDripzCounter, StellarDripzCounterClient};
    use soroban_sdk::{Env, Address, String};

    #[test]
    fn test_counter_increment() {
        let env = Env::default();
        let user = Address::generate(&env);
        env.mock_all_auths();

        let contract_id = env.register(StellarDripzCounter, ());
        let client = StellarDripzCounterClient::new(&env, &contract_id);

        assert_eq!(client.get_global(), 0);
        assert_eq!(client.increment(&user), 1);
        assert_eq!(client.get_global(), 1);
        assert_eq!(client.increment(&user), 2);
        assert_eq!(client.get_global(), 2);
    }

    #[test]
    fn test_greeting() {
        let env = Env::default();
        let user = Address::generate(&env);
        env.mock_all_auths();

        let contract_id = env.register(StellarDripzCounter, ());
        let client = StellarDripzCounterClient::new(&env, &contract_id);

        assert_eq!(
            client.get_greeting(),
            String::from_str(&env, "Hello from StellarDripz!")
        );

        let msg = String::from_str(&env, "Drip it!");
        client.set_greeting(&user, &msg);
        assert_eq!(client.get_greeting(), msg);
    }

    #[test]
    fn test_user_counter_independent() {
        let env = Env::default();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        env.mock_all_auths();

        let contract_id = env.register(StellarDripzCounter, ());
        let client = StellarDripzCounterClient::new(&env, &contract_id);

        assert_eq!(client.get_global(), 0);

        // Alice increments
        assert_eq!(client.increment(&alice), 1);
        assert_eq!(client.get_global(), 1);

        // Bob increments
        assert_eq!(client.increment(&bob), 2);
        assert_eq!(client.get_global(), 2);
    }
}
