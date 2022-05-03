const ethers = require("ethers")

const ETHToken = artifacts.require("./ETHToken")
const ETHBridge = artifacts.require("./ETHBridge")

const PolyToken = artifacts.require("./PolyToken")
const PolyBridge = artifacts.require("./PolyBridge")

module.exports = async function (deployer, network, addresses) {

    const name = "Test Core Token"
    const symbol = "TCT"
    const supply = ethers.utils.parseUnits('5000000', 'ether') // 1,000,000 Tokens

    // Ideally we first deploy to rinkeby, then we deploy to binance testnet.

    if (network === 'rinkeby') {
        await deployer.deploy(ETHToken, name, symbol)
        const token = await ETHToken.deployed()

        await token.mint(addresses[0], supply)

        await deployer.deploy(ETHBridge, token.address)
        const bridge = await ETHBridge.deployed()

        await token.setBridge(bridge.address)
    }

    if (network === 'mumbai_testnet') {
        await deployer.deploy(PolyToken, name, symbol)
        const token = await PolyToken.deployed()

        await deployer.deploy(PolyBridge, token.address)
        const bridge = await PolyBridge.deployed()

        await token.setBridge(bridge.address)
    }

    // if (network === 'development') {
    //     let token, bridge

    //     await deployer.deploy(ETHToken, name, symbol)
    //     token = await ETHToken.deployed()

    //     await token.mint(addresses[0], supply)

    //     await deployer.deploy(ETHBridge, token.address)
    //     bridge = await ETHBridge.deployed()

    //     await token.setBridge(bridge.address)

    //     await deployer.deploy(BSCToken, name, symbol)
    //     token = await BSCToken.deployed()

    //     await deployer.deploy(BSCBridge, token.address)
    //     bridge = await BSCBridge.deployed()

    //     await token.setBridge(bridge.address)
    // }
} 