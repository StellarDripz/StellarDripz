use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, symbol_short};
use crate::common::storage as s;
use crate::common::events as e;
use crate::token;

// ---- Data Types ----

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub for_votes: i128,
    pub against_votes: i128,
    pub abstain_votes: i128,
    pub created_ledger: u32,
    pub voting_end: u32,
    pub executed: bool,
    pub passed: bool,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct VoteRecord {
    pub proposal_id: u64,
    pub vote: VoteChoice,
    pub power: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum VoteChoice {
    For = 0,
    Against = 1,
    Abstain = 2,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum GovernanceAction {
    SetRewardRate(i128),
    SetMinStake(i128),
    SetLockPeriod(u32),
    SetActive(bool),
    MintTokens(Address, i128),
}

// ---- Storage Keys ----

const KEY_PROPOSAL_COUNT: Symbol = symbol_short!("PROP_CT");
const KEY_PROPOSAL: Symbol = symbol_short!("PROP");
const KEY_VOTES: Symbol = symbol_short!("VOTES");
const KEY_TOKEN_ID: Symbol = symbol_short!("TOK_ID");
const KEY_POOL_ID: Symbol = symbol_short!("POOL_ID");
const KEY_VOTING_PERIOD: Symbol = symbol_short!("VOT_PER");
const KEY_MIN_POWER: Symbol = symbol_short!("MIN_POW");

#[contract]
pub struct DripGovernance;

// ---- Implementation ----

#[contractimpl]
impl DripGovernance {
    /// Initialize governance with token and pool contract references.
    pub fn initialize(
        env: Env,
        admin: Address,
        token_contract_id: Address,
        pool_contract_id: Address,
        voting_period: u32,
        min_voting_power: i128,
    ) {
        if env.storage().persistent().has(&s::KEY_ADMIN) {
            panic!("Already initialized");
        }
        admin.require_auth();

        s::set_persistent(&env, &s::KEY_ADMIN, &admin);
        s::set_persistent(&env, &KEY_TOKEN_ID, &token_contract_id);
        s::set_persistent(&env, &KEY_POOL_ID, &pool_contract_id);
        s::set_persistent(&env, &KEY_VOTING_PERIOD, &voting_period);
        s::set_persistent(&env, &KEY_MIN_POWER, &min_voting_power);
        s::set_persistent(&env, &KEY_PROPOSAL_COUNT, &0u64);

        e::publish(&env, (symbol_short!("gov_init"), &admin), voting_period);
    }

    /// Create a new proposal. Requires minimum voting power.
    pub fn propose(env: Env, proposer: Address, title: String, description: String) -> u64 {
        proposer.require_auth();

        let token_id: Address = s::get_persistent(
            &env, &KEY_TOKEN_ID,
            Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        );

        // --- CROSS-CONTRACT CALL: Query token balance for voting power ---
        let voting_power = Self::get_voting_power_internal(&env, &proposer, &token_id);

        let min_power: i128 = s::get_persistent(&env, &KEY_MIN_POWER, 0i128);
        if voting_power < min_power {
            panic!("Insufficient voting power to propose");
        }
        // --- END CROSS-CONTRACT CALL ---

        let mut count: u64 = s::get_persistent(&env, &KEY_PROPOSAL_COUNT, 0u64);
        count += 1;
        s::set_persistent(&env, &KEY_PROPOSAL_COUNT, &count);

        let current_ledger = env.ledger().sequence();
        let voting_period: u32 = s::get_persistent(&env, &KEY_VOTING_PERIOD, 100u32);

        let proposal = Proposal {
            id: count,
            proposer: proposer.clone(),
            title: title.clone(),
            description,
            for_votes: 0,
            against_votes: 0,
            abstain_votes: 0,
            created_ledger: current_ledger,
            voting_end: current_ledger + voting_period,
            executed: false,
            passed: false,
        };

        let key = (KEY_PROPOSAL, count);
        env.storage().persistent().set(&key, &proposal);

        e::publish(&env, (e::EVENT_PROPOSE, &proposer, count), title);
        count
    }

    /// Vote on a proposal. Voting power = token balance via cross-contract call.
    pub fn vote(env: Env, voter: Address, proposal_id: u64, choice: VoteChoice) {
        voter.require_auth();

        let key = (KEY_PROPOSAL, proposal_id);
        let mut proposal: Proposal = env.storage().persistent().get(&key).unwrap_or_else(|| {
            panic!("Proposal not found");
        });

        if env.ledger().sequence() > proposal.voting_end {
            panic!("Voting period has ended");
        }
        if proposal.executed {
            panic!("Proposal already executed");
        }

        // Check for duplicate vote
        let vote_key = (KEY_VOTES, proposal_id, voter.clone());
        if env.storage().persistent().has(&vote_key) {
            panic!("Already voted");
        }

        // --- CROSS-CONTRACT CALL: Get voting power from token balance ---
        let token_id: Address = s::get_persistent(
            &env, &KEY_TOKEN_ID,
            Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        );
        let power = Self::get_voting_power_internal(&env, &voter, &token_id);
        // --- END CROSS-CONTRACT CALL ---

        if power <= 0 {
            panic!("No voting power");
        }

        match choice {
            VoteChoice::For => proposal.for_votes += power,
            VoteChoice::Against => proposal.against_votes += power,
            VoteChoice::Abstain => proposal.abstain_votes += power,
        }

        let vote_record = VoteRecord { proposal_id, vote: choice, power };
        env.storage().persistent().set(&vote_key, &vote_record);
        env.storage().persistent().set(&key, &proposal);

        e::publish(&env, (e::EVENT_VOTE, &voter, proposal_id), power);
    }

    /// Execute a passed proposal.
    pub fn execute(env: Env, executor: Address, proposal_id: u64) {
        executor.require_auth();

        let key = (KEY_PROPOSAL, proposal_id);
        let mut proposal: Proposal = env.storage().persistent().get(&key).unwrap_or_else(|| {
            panic!("Proposal not found");
        });

        if proposal.executed {
            panic!("Already executed");
        }
        if env.ledger().sequence() <= proposal.voting_end {
            panic!("Voting period still active");
        }

        // Check if proposal passed
        if proposal.for_votes > proposal.against_votes {
            proposal.passed = true;
        }
        proposal.executed = true;
        env.storage().persistent().set(&key, &proposal);

        e::publish(&env, (symbol_short!("execute"), &executor, proposal_id), proposal.passed);
    }

    /// Get voting power by querying the token contract's balance.
    /// Uses cross-contract call to DripToken::balance().
    fn get_voting_power_internal(env: &Env, voter: &Address, token_id: &Address) -> i128 {
        let token_client = token::DripTokenClient::new(env, token_id);
        token_client.balance(voter)
    }

    // ---- Getters ----

    pub fn get_proposal(env: Env, proposal_id: u64) -> Option<Proposal> {
        let key = (KEY_PROPOSAL, proposal_id);
        env.storage().persistent().get(&key)
    }

    pub fn get_proposal_count(env: Env) -> u64 {
        s::get_persistent(&env, &KEY_PROPOSAL_COUNT, 0u64)
    }

    pub fn get_vote(env: Env, voter: Address, proposal_id: u64) -> Option<VoteRecord> {
        let key = (KEY_VOTES, proposal_id, voter);
        env.storage().persistent().get(&key)
    }

    pub fn get_voting_power(env: Env, voter: Address) -> i128 {
        let token_id: Address = s::get_persistent(
            &env, &KEY_TOKEN_ID,
            Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
        );
        Self::get_voting_power_internal(&env, &voter, &token_id)
    }

    pub fn get_config(env: Env) -> (Address, Address, u32, i128) {
        let token_id: Address = s::get_persistent(&env, &KEY_TOKEN_ID, Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")));
        let pool_id: Address = s::get_persistent(&env, &KEY_POOL_ID, Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")));
        let voting_period: u32 = s::get_persistent(&env, &KEY_VOTING_PERIOD, 100u32);
        let min_power: i128 = s::get_persistent(&env, &KEY_MIN_POWER, 0i128);
        (token_id, pool_id, voting_period, min_power)
    }
}

// ---- Tests ----

#[cfg(test)]
mod governance_test {
    use super::*;
    use soroban_sdk::Env;
    use crate::token::DripToken;

    #[test]
    fn test_create_proposal() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::random(&env);
        let proposer = Address::random(&env);

        // Deploy token and mint to proposer for voting power
        let token_id = env.register(DripToken, ());
        let token_client = token::DripTokenClient::new(&env, &token_id);
        token_client.initialize(&admin, &String::from_str(&env, "DT"), &String::from_str(&env, "D"), &7u32);
        token_client.mint(&admin, &proposer, &1000i128);

        let pool_id = Address::random(&env);
        let contract_id = env.register(DripGovernance, ());
        let client = DripGovernanceClient::new(&env, &contract_id);
        client.initialize(&admin, &token_id, &pool_id, &100u32, &1i128);

        let id = client.propose(
            &proposer,
            &String::from_str(&env, "Reduce rewards"),
            &String::from_str(&env, "We should reduce the reward rate by 50%"),
        );

        assert_eq!(id, 1);
        assert_eq!(client.get_proposal_count(), 1);

        let prop = client.get_proposal(&1).unwrap();
        assert!(!prop.executed);
        assert!(!prop.passed);
    }

    #[test]
    fn test_vote_and_execute() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::random(&env);
        let proposer = Address::random(&env);
        let voter = Address::random(&env);

        // Deploy token and mint to both proposer and voter
        let token_id = env.register(DripToken, ());
        let token_client = token::DripTokenClient::new(&env, &token_id);
        token_client.initialize(&admin, &String::from_str(&env, "DT"), &String::from_str(&env, "D"), &7u32);
        token_client.mint(&admin, &proposer, &1000i128);
        token_client.mint(&admin, &voter, &5000i128);

        let pool_id = Address::random(&env);
        let contract_id = env.register(DripGovernance, ());
        let client = DripGovernanceClient::new(&env, &contract_id);
        client.initialize(&admin, &token_id, &pool_id, &100u32, &0i128);

        let id = client.propose(
            &proposer,
            &String::from_str(&env, "Test proposal"),
            &String::from_str(&env, "Test description"),
        );

        // Vote with real token balance as voting power
        client.vote(&voter, &id, &VoteChoice::For);
        let vote = client.get_vote(voter.clone(), id).unwrap();
        assert_eq!(vote.vote, VoteChoice::For);
        assert_eq!(vote.power, 5000i128);

        // Advance past voting period
        env.ledger().set_sequence_number(200);

        // Execute
        client.execute(&admin, &id);
        let prop = client.get_proposal(&id).unwrap();
        assert!(prop.executed);
        assert!(prop.passed);
    }
}
// Vote tally: weighted by token balance for proportional representation

