import { useState, useEffect } from 'react'
import { Row, Spinner } from 'react-bootstrap'
import { ethers } from "ethers"
import './App.css'

// Import Components
import Navbar from './Navbar'

// Import Contract's ABIS
import ETHToken from '../abis/ETHToken.json';
import ETHBridge from '../abis/ETHBridge.json';
import PolyToken from '../abis/PolyToken.json';
import PolyBridge from '../abis/PolyBridge.json';

function App() {
	const [networkId, setNetworkId] = useState(null)
	const [otherNetwork, setOtherNetwork] = useState("")

	const [ethProvider, setETHProvider] = useState(null)
	const [mumbaiProvider, setPolyProvider] = useState(null)

	const [ethBridge, setETHBridge] = useState(null)
	const [polyBridge, setPolyBridge] = useState(null)

	const [ethToken, setETHToken] = useState(null)
	const [polyToken, setPolyToken] = useState(null)

	const [account, setAccount] = useState(null)
	const [ethSigner, setETHSigner] = useState(null)
	const [polySigner, setPolySigner] = useState(null)

	const [amount, setAmount] = useState(0)

	const [isLoading, setIsLoading] = useState(true)
	const [hasProcessed, setHasProcessed] = useState(false)
	const [message, setMessage] = useState("Awaiting MetaMask Connection...")

	const loadWeb3 = async () => {
		console.log('called')

		if (window.ethereum.networkVersion === '4') {
			// Set provider for Rinkeby (MetaMask)
			const ethProvider = new ethers.providers.Web3Provider(window.ethereum)
			setETHProvider(ethProvider)

			// Set provider for Polygon mumbai Testnet
			const mumbaiProvider = new ethers.providers.JsonRpcProvider(`https://polygon-mumbai.infura.io/v3/${process.env.REACT_APP_INFURA_API_KEY}`)
			setPolyProvider(mumbaiProvider)

			// Set signer
			const ethSigner = ethProvider.getSigner()
			setETHSigner(ethSigner)

			setOtherNetwork("Mumbai")

			await loadContracts()
		}

		if (window.ethereum.networkVersion === '80001') {
			// Set provider for Polygon Mumbai Testnet (MetaMask)
			const mumbaiProvider = new ethers.providers.Web3Provider(window.ethereum)
			setPolyProvider(mumbaiProvider)

			// Set provider for Rinkeby
			const ethProvider = new ethers.providers.JsonRpcProvider(`https://rinkeby.infura.io/v3/${process.env.REACT_APP_INFURA_API_KEY}`)
			setETHProvider(ethProvider)

			// Set signer
			const polySigner = mumbaiProvider.getSigner()
			setPolySigner(polySigner)

			setOtherNetwork("Rinkeby")

			await loadContracts()
		}

		window.ethereum.on('chainChanged', (chainId) => {
			window.location.reload();
		})

		window.ethereum.on('accountsChanged', function (accounts) {
			setAccount(accounts[0])
		})
	}

	const loadContracts = async () => {
		if (!ethProvider && !mumbaiProvider) {
			return
		}

		if (networkId !== '5777') {
			setMessage("Loading Contracts...")

			const ethBridge = new ethers.Contract(ETHBridge.networks[4].address, ETHBridge.abi, ethProvider)
			setETHBridge(ethBridge)

			const polyBridge = new ethers.Contract(PolyBridge.networks[80001].address, PolyBridge.abi, mumbaiProvider)
			setPolyBridge(polyBridge)

			const ethTokenAddress = await ethBridge.token()
			const ethToken = new ethers.Contract(ethTokenAddress, ETHToken.abi, ethProvider)
			setETHToken(ethToken)

			const polyTokenAddress = await polyBridge.token()
			const polyToken = new ethers.Contract(polyTokenAddress, PolyToken.abi, mumbaiProvider)
			setPolyToken(polyToken)

			// Depending on the network, we listen for when tokens are burned from the bridgeto mint 
			// tokens on the other network... This is only for demonstration, for security it's more ideal to
			// have this specific logic on a server somewhere else, with a more secure implementation in place
			// incase of potential downtime (or if a user refreshes the page)!
			//CURRENTLY WORKING ON UPDATING THIS LOGIC WITH CHAINLINK KEEPERS

			// If networkId === 4 (Rinkeby), listen to transfer events from the ETHBridge, then make a call to PolyBridge
			if (networkId === '4') {
				ethBridge.on('Transfer', async (from, to, amount, date, nonce, signature, step) => {
					const polyWallet = new ethers.Wallet(process.env.REACT_APP_PRIVATE_KEY)
					const polySigner = polyWallet.connect(mumbaiProvider)
					const bridge = polyBridge.connect(polySigner)

					// Call mint function from here...
					await bridge.mint(from, to, amount, nonce, signature)

					setHasProcessed(true)
					setIsLoading(false)
				})
			}

			// If networkId === 80001 (Mumbai Testnet), listen to transfer events from the PolyBridge, then make a call to ETHBridge
			if (networkId === '80001') {
				polyBridge.on('Transfer', async (from, to, amount, date, nonce, signature, step) => {
					const ethWallet = new ethers.Wallet(process.env.REACT_APP_PRIVATE_KEY)
					const ethSigner = ethWallet.connect(ethProvider)
					const bridge = ethBridge.connect(ethSigner)

					// Call mint function from here...
					await bridge.mint(from, to, amount, nonce, signature)

					setHasProcessed(true)
					setIsLoading(false)
				})
			}
		} else {
			return
		}
		setIsLoading(false)
	}

	// MetaMask Login/Connect
	const web3Handler = async () => {
		const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
		setAccount(accounts[0])
		setNetworkId(window.ethereum.networkVersion)
	}

	const bridgeHandler = async () => {
		const amountInWei = ethers.utils.parseUnits(amount.toString(), 'ether')

		if (networkId === '4') { // Rinkeby
			// Connect account with contract...
			const bridge = await ethBridge.connect(ethSigner)
			const id = await bridge.transferCount(account)

			// Create hash message, and have user sign it...
			const hashedMessage = ethers.utils.solidityKeccak256(["address", "uint256", "uint256"], [account, amountInWei, (Number(id) + 1)])
			const other = ethers.utils.arrayify(hashedMessage)
			const signature = await ethSigner.signMessage(other)

			setMessage("Bridging over... Do NOT refresh the page!")
			setIsLoading(true)

			// Burn tokens...
			await bridge.burn(account, amountInWei, signature)
		}

		if (networkId === '80001') { // Mumbai Testnet
			// Connect account with contract...
			const bridge = await polyBridge.connect(polySigner)
			const id = await bridge.transferCount(account)

			// Create hash message, and have user sign it...
			const hashedMessage = ethers.utils.solidityKeccak256(["address", "uint256", "uint256"], [account, amountInWei, (Number(id) + 1)])
			const other = ethers.utils.arrayify(hashedMessage)
			const signature = await polySigner.signMessage(other)

			setMessage("Bridging over... Do NOT refresh the page!")
			setIsLoading(true)

			// Burn tokens...
			await bridge.burn(account, amountInWei, signature)
		}
	}

	const addTokenHandler = async () => {
		let address

		if (networkId === '4') { // Rinkeby
			address = ethToken.address
		}

		if (networkId === '80001') { // Mumbai Testnet
			console.log(polyToken)
			address = polyToken.address
		}

		await window.ethereum.request({
			method: 'wallet_watchAsset',
			params: {
				type: 'ERC20',
				options: {
					address: address,
					symbol: "TCT",
					decimals: 18,
				},
			},
		})
	}

	const changeNetworkHandler = async () => {
		let chainId

		if (networkId === '4') { // Rinkeby
			chainId = '0x13881'
		}

		if (networkId === '80001') { // Mumbai Testnet
			chainId = '0x4'
		}

		await window.ethereum.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: chainId }],
		})
	}

	useEffect(() => {
		loadWeb3()
	}, [account, networkId]);

	return (
		<div className="App">

			<Navbar web3Handler={web3Handler} account={account} />

			{isLoading ? (
				<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
					<Spinner animation="border" style={{ display: 'flex' }} />
					<p className='mx-3 my-0'>{message}</p>
				</div>
			) : (
				<main className='p-3'>
					<h1 className='my-4' >Web3Flow Dapp</h1>
					<hr />
					<Row className='text-center'>
						<p>Bridge your $TBT tokens between Rinkeby and Binance Chain</p>
						<div>
							<input type="number" onChange={(e) => { setAmount(e.target.value) }} placeholder='Enter amount' />
							<button onClick={bridgeHandler} className='button btn-sm mx-3'>{`Bridge to ${otherNetwork}`}</button>
						</div>
					</Row>
					<hr />
					<Row className='text-center'>
						{networkId === '4' ? (
							<div>
								<p>Currently connected to Rinkeby</p>
								<button onClick={addTokenHandler} className='button btn-sm p-2'>Add Token to MetaMask</button>
							</div>
						) : networkId === '80001' ? (
							<div>
								<p>Currently connected to Polygon Mumbai Testnet</p>
								<button onClick={addTokenHandler} className='button btn-sm p-2'>Add Token to MetaMask</button>
							</div>
						) : (
							<p>Unidentified network, please connect to Rinkeby or Mumbai Testnet</p>
						)}
					</Row>
					{hasProcessed ? (
						<Row></Row>
					): (
						<Row className='text-center'>
							<div>
								<button onClick={changeNetworkHandler} className='button btn-sm'>Switch Network</button>
							</div>
						</Row>
					) }
				</main>
			)}
		</div>
	);
}

export default App;
