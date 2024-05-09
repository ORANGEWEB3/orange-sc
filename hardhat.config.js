require("dotenv").config();
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
// require("@nomicfoundation/hardhat-verify");

require("@nomiclabs/hardhat-web3");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-abi-exporter");
require("hardhat-contract-sizer");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-tracer");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const privateKey = process.env.PRIVATE_KEY;
const etherscan = process.env.ETHERSCAN_API_KEY;
const infuraKey = process.env.INFURA_KEY;
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.24",
        settings: {
          evmVersion: "paris"
        },
      },
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ],
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 50,
    enabled: true,
  },
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${infuraKey}`,
      accounts: [privateKey],
    },
    // testnet: {
    //   url: "https://data-seed-prebsc-2-s1.binance.org:8545/",
    //   accounts: [privateKey],
    // },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${infuraKey}`,
      accounts: [privateKey],
    },
    // bsc: {
    //   url: "https://bsc-dataseed.binance.org/",
    //   accounts: [privateKey],
    // },
    goerli: {
      url: `https://rpc.ankr.com/eth_goerli`,
      accounts: [privateKey],
    },
    mabul: {
      url: `https://nd-805-692-845.p2pify.com/964e6088a03636c61fb0b3fb5775bb87/ext/bc/24DcEgpskDvGYC2VaKF6VYKpsReGqzCSi5beLffb8zcqvFagYM/rpc`,
      accounts: [privateKey],
    },
    dfk: {
      url: `https://subnets.avax.network/defi-kingdoms/dfk-chain-testnet/rpc`,
      accounts: [privateKey]
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${infuraKey}`,
      accounts: [privateKey],
    },
    arbitrumSepolia: {
      url: `https://arbitrum-sepolia.infura.io/v3/cf9b39e6c82d49e7972db3f974dec006`,
      accounts: [privateKey],
    },
    snowtrace: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts: [privateKey]
    },
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      accounts: [privateKey]
    }
  },
  etherscan: {
    apiKey: {
      snowtrace: "8IBQFYA6YSAFDTI9BTGTNBMWAS3973CSS8",
      fuji: "8IBQFYA6YSAFDTI9BTGTNBMWAS3973CSS8"
    },
    customChains: [
      {
        network: "dfk",
        chainId: 335,
        urls: {
          apiURL: "https://api.avascan.info/v2/network/testnet/evm/335/etherscan",
          browserURL: "https://testnet.avascan.info/blockchain/dfk"
        }
      },
      {
        network: "mabul",
        chainId: 99791,
        urls: {
          apiURL: "https://api.avascan.info/v2/network/testnet/evm/99791/etherscan",
          browserURL: "https://testnet.avascan.info/blockchain/mabul"
        }
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
            apiURL: "https://api-sepolia.arbiscan.io/api",
            browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "snowtrace",
        chainId: 43114,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan",
          browserURL: "https://snowtrace.io"
        }
      },
      {
        network: "fuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
          browserURL: "https://testnet.snowtrace.io"
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  }
};
