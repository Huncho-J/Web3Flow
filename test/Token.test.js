const ETHToken = artifacts.require("./ETHToken")
const PolyToken = artifacts.require("./PolyToken")

require('chai')
    .use(require('chai-as-promised'))
    .should()

const EVM_REVERT = 'VM Exception while processing transaction: revert'

contract('Token', ([deployer]) => {

    const name = 'Test Core Token'
    const symbol = 'TCT'

    let ethToken, polyToken, result

    describe('Deployment', () => {

        beforeEach(async () => {
            ethToken = await ETHToken.new(name, symbol)
            polyToken = await PolyToken.new(name, symbol)
        })

        it('Returns the token name', async () => {
            result = await ethToken.name()
            result.should.equal(name)

            result = await polyToken.name()
            result.should.equal(name)
        })

        it('Returns the token symbol', async () => {
            result = await ethToken.symbol()
            result.should.equal(symbol)

            result = await polyToken.symbol()
            result.should.equal(symbol)
        })

        it('Returns owner address', async () => {
            result = await ethToken.owner()
            result.should.equal(deployer)

            result = await polyToken.owner()
            result.should.equal(deployer)
        })

        it('Returns bridge address', async () => {
            // Remember, initial deployment of contract assigns deployer as bridge (to allow inital mint)
            result = await ethToken.bridge()
            result.should.equal(deployer)

            result = await bscToken.bridge()
            result.should.equal(deployer)
        })
    })
})