export const CONTRACT_ADDRESS = '0x5fB3acA5b521dC2bA628272Bafc2b5Be3FA6EedE' as const;

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "AnswersSubmitted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_OPTIONS",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "QUESTION_COUNT",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "viewer",
        "type": "address"
      }
    ],
    "name": "allowCounts",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
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
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "questionIndex",
        "type": "uint8"
      }
    ],
    "name": "getEncryptedChoice",
    "outputs": [
      {
        "internalType": "euint8",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "questionIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "optionIndex",
        "type": "uint8"
      }
    ],
    "name": "getEncryptedCount",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "hasSubmitted",
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
    "inputs": [
      {
        "internalType": "uint8",
        "name": "questionIndex",
        "type": "uint8"
      }
    ],
    "name": "optionCountForQuestion",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint8",
        "name": "q0",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "q1",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "q2",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "q3",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint8",
        "name": "q4",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "submitAnswers",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
