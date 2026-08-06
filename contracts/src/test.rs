#![cfg(test)]

use soroban_sdk::Env;

#[test]
fn test_counter_increment() {
    let env = Env::default();
    let user = soroban_sdk::Address::random(&env);
    env.mock_all_auths();

    let contract_id = env.register(super::StellarDripzCounter, ());
    let client = super::StellarDripzCounterClient::new(&env, &contract_id);

    assert_eq!(client.get_global(), 0);
    assert_eq!(client.increment(&user), 1);
    assert_eq!(client.get_global(), 1);
    assert_eq!(client.increment(&user), 2);
    assert_eq!(client.get_global(), 2);
}

#[test]
fn test_greeting() {
    let env = Env::default();
    let user = soroban_sdk::Address::random(&env);
    env.mock_all_auths();

    let contract_id = env.register(super::StellarDripzCounter, ());
    let client = super::StellarDripzCounterClient::new(&env, &contract_id);

    assert_eq!(
        client.get_greeting(),
        soroban_sdk::String::from_str(&env, "Hello from StellarDripz!")
    );

    let msg = soroban_sdk::String::from_str(&env, "Drip it!");
    client.set_greeting(&user, &msg);
    assert_eq!(client.get_greeting(), msg);
}
