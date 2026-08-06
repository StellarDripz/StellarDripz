import { saveTransaction, getTransactions, clearDb } from "@/lib/server/dbService";
describe("dbService", () => {
  it("saves and retrieves", () => { clearDb(); saveTransaction({ id: "t", type: "faucet", status: "success", hash: "h", amount: "10", senderAddress: "s", destinationAddress: "d", timestamp: 1 }); expect(getTransactions().length).toBe(1); });
});
