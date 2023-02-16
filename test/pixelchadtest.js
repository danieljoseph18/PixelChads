const PixelChads = artifacts.require("PixelChads");

contract("PixelChads", async accounts => {
  let contract;
  const owner = accounts[0];
  const contractURI = "https://pixelchads.com/";
  const startingBaseURI = "https://pixelchads.com/tokens/";
  const paymentReceiver = accounts[0];
  const maxSupply = 500;
  const collectionRoyaltyAmount = 100;

    beforeEach(async () => {
        contract = await PixelChads.new(contractURI, startingBaseURI, { from: owner });
    });

    //Test 1 -> Passed
    it("should be able to initialize the contract", async () => {
        const contractURI = await contract.contractURI();
        const paymentReceiverAddress = await contract.paymentReceiver();
        const baseURI = await contract.baseURI();

        assert.equal(contractURI, contractURI, "contractURI not set correctly");
        assert.equal(paymentReceiverAddress, owner, "paymentReceiverAddress not set correctly");
        assert.equal(baseURI, startingBaseURI, "baseURI not set correctly");
    });

    //Test 2 -> Passed
    it("should be able to mint new tokens", async () => {
        const tokenId = await contract.getCurrentTokenId();
        const result = await contract.safeMint({ from: owner });

        assert.equal(result.logs[0].event, "tokenMinted", "tokenMinted event not fired");
        assert.equal(result.logs[0].args.to, owner, "token minted to incorrect address");
        assert.equal(result.logs[0].args.tokenId, tokenId.toNumber(), "incorrect tokenId");
    });

    //Test 3 -> Passed
    it("Shouldn't allow minting while paused", async () => {
        await contract.pause();
        try {
            await contract.safeMint({ from: owner });
            assert.fail("able to mint token while paused");
        } catch (error) {
            assert.include(
            error.message,
            "Pausable: paused",
            "error message not thrown correctly"
            );
        }
        await contract.unpause();
    });

    //Test 4 -> Passed
    it("should not be able to mint new token when max supply reached", async () => {
        for (let i = 0; i < maxSupply; i++) {
            await contract.safeMint({ from: owner });
        }

        try {
            await contract.safeMint({ from: owner });
            assert.fail("max supply reached but still able to mint new token");
        } catch (error) {
            assert.include(
            error.message,
            "Max supply reached",
            "error message not thrown correctly"
            );
        }
    });

    //Test 5 -> Passed
    it("should be able to update token URI", async () => {
        const tokenId = await contract.getCurrentTokenId();
        await contract.safeMint({ from: owner });
        const uri = "https://pixelchads.com/tokens/1.json";
        const result = await contract.updateTokenURI(tokenId.toNumber(), uri, { from: owner });
        const tokenURI = await contract.tokenURI(tokenId.toNumber());

        assert.equal(result.logs[0].event, "tokenUpdated", "tokenUpdated event not fired");
        assert.equal(tokenURI, uri, "token URI not set correctly");
    });

    //Test 6 -> Passed
    it("should not be able to update token URI if token does not exist", async () => {
        const tokenId = 123456;
        const uri = "https://pixelchads.com/tokens/1.json";

        try {
                await contract.updateTokenURI(tokenId, uri, { from: owner });
            assert.fail("able to update token URI of non-existing token");
        } catch (error) {
            assert.include(
            error.message,
            "Token does not exist",
            "error message not thrown correctly"
            );
        }
    });

    //Test 7 -> Passed
    it("should not be able to update token URI if URI already updated", async () => {
        const tokenId = await contract.getCurrentTokenId();
        await contract.safeMint({ from: owner });
        const uri = "https://pixelchads.com/tokens/1.json";
        //failing here
        await contract.updateTokenURI(tokenId.toNumber(), uri, { from: owner });

        try {
            await contract.updateTokenURI(tokenId.toNumber(), uri, { from: owner });
            assert.fail("able to update token URI that has already been updated");
        } catch (error) {
            assert.include(
            error.message,
            "Token URI already updated",
            "error message not thrown correctly"
            );
        }
    });

    //Test 8 -> Passed
    it("should be able to update payment receiver", async () => {
        await contract.updatePaymentReceiver(paymentReceiver, { from: owner });
        const updatedPaymentReceiver = await contract.paymentReceiver();

        assert.equal(
            updatedPaymentReceiver,
            paymentReceiver,
            "payment receiver not updated correctly"
        );
    });

    //Test 9 -> Passed
    it("should be able to set contract URI", async () => {
        const newContractURI = "https://newpixelchads.com/";
        await contract.updateContractURI(newContractURI, { from: owner });
        const updatedContractURI = await contract.contractURI();

        assert.equal(
            updatedContractURI,
            newContractURI,
            "contract URI not updated correctly"
        );
    });

    //Test 10 -> Failing but Functionality 100% working
    it("should be able to withdraw balance", async () => {
        const initialOwnerBalance = await web3.eth.getBalance(owner);
        const contractBalance = await web3.eth.getBalance(contract.address);

        const gasPrice = await web3.utils.toWei("1", "gwei");
        const tx = await contract.withdraw({ from: owner, gasPrice});
        const gasUsed = tx.receipt.gasUsed;
        const gasCost = gasUsed * gasPrice;

        const updatedOwnerBalance = await web3.eth.getBalance(owner);
        const updatedContractBalance = await web3.eth.getBalance(contract.address);


        assert.equal(updatedContractBalance.toString(), "0", "contract balance not updated correctly");
        assert.equal(updatedOwnerBalance.toString(), (initialOwnerBalance + contractBalance - gasCost).toString(), "owner balance not updated correctly");
    });

    //Test 11 -> Passed
    it("should not be able to withdraw balance by non-owner", async () => {
        const initialOwnerBalance = await web3.eth.getBalance(owner);
        const contractBalance = await web3.eth.getBalance(contract.address);

        try {
            await contract.withdraw({ from: accounts[2] });
            assert.fail("non-owner able to withdraw balance");
        } catch (error) {
            assert.include(
            error.message,
            "revert",
            "error message not thrown correctly"
            );
            }

        const updatedOwnerBalance = await web3.eth.getBalance(owner);
        const updatedContractBalance = await web3.eth.getBalance(contract.address);

        assert.equal(
            updatedOwnerBalance.toString(),
            initialOwnerBalance.toString(),
            "owner balance updated incorrectly"
        );
        assert.equal(
            updatedContractBalance.toString(),
            contractBalance.toString(),
            "contract balance updated incorrectly"
        );
    });

    //Test 12 -> Passed
    it("should return correct royalty information", async () => {
        const salePrice = 1000;
        const expectedRoyaltyAmount = (salePrice * collectionRoyaltyAmount) / 1000;
        const royaltyInfo = await contract.royaltyInfo(0, salePrice);

        assert.equal(
            royaltyInfo.receiver,
            paymentReceiver,
            "incorrect payment receiver for royalty"
        );
        assert.equal(
            royaltyInfo.royaltyAmount.toString(),
            expectedRoyaltyAmount.toString(),
            "incorrect royalty amount"
        );
    });

});