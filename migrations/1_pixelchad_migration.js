const PixelChads = artifacts.require("PixelChads");

module.exports = function (deployer) {
    const contractURI = "https://pixelchads.com/";
    const startingBaseURI = "https://pixelchads.com/tokens/";
    deployer.deploy(PixelChads, contractURI, startingBaseURI);
}