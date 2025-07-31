export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;


export const contractAbi = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "x",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "y",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "colorIndex",
          "type": "uint8"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "paintedBy",
          "type": "address"
        }
      ],
      "name": "PixelPainted",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "isPaintingActive",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "_x",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "_y",
          "type": "uint8"
        },
        {
          "internalType": "uint8",
          "name": "_colorIndex",
          "type": "uint8"
        }
      ],
      "name": "paint",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paintFee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_newFee",
          "type": "uint256"
        }
      ],
      "name": "setPaintFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "togglePainting",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const; 