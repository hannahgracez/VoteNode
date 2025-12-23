// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted personality survey (5 questions)
/// @notice Users submit encrypted answers; the contract keeps encrypted tallies.
///         Only the user is granted ACL access to decrypt their own answers.
contract EncryptedPersonalitySurvey is ZamaEthereumConfig {
    uint8 public constant QUESTION_COUNT = 5;
    uint8 public constant MAX_OPTIONS = 4;

    mapping(address => bool) private _hasSubmitted;
    mapping(address => mapping(uint8 => euint8)) private _choices;
    mapping(uint8 => mapping(uint8 => euint32)) private _counts;

    event AnswersSubmitted(address indexed user);

    function hasSubmitted(address user) external view returns (bool) {
        return _hasSubmitted[user];
    }

    function optionCountForQuestion(uint8 questionIndex) public pure returns (uint8) {
        require(questionIndex < QUESTION_COUNT, "Invalid question");
        if (questionIndex == 0) return 2;
        if (questionIndex == 1) return 3;
        if (questionIndex == 2) return 4;
        if (questionIndex == 3) return 2;
        return 3;
    }

    /// @notice Returns a user's encrypted choice handle for a question.
    /// @dev The ACL is managed during submission. This function does not use msg.sender.
    function getEncryptedChoice(address user, uint8 questionIndex) external view returns (euint8) {
        require(questionIndex < QUESTION_COUNT, "Invalid question");
        return _choices[user][questionIndex];
    }

    /// @notice Returns the encrypted tally handle for a question/option pair.
    function getEncryptedCount(uint8 questionIndex, uint8 optionIndex) external view returns (euint32) {
        require(questionIndex < QUESTION_COUNT, "Invalid question");
        require(optionIndex < MAX_OPTIONS, "Invalid option");
        return _counts[questionIndex][optionIndex];
    }

    /// @notice Submit all 5 encrypted answers in a single transaction.
    /// @dev Values outside the allowed option range for a question are normalized to 0.
    function submitAnswers(
        externalEuint8 q0,
        externalEuint8 q1,
        externalEuint8 q2,
        externalEuint8 q3,
        externalEuint8 q4,
        bytes calldata inputProof
    ) external {
        require(!_hasSubmitted[msg.sender], "Already submitted");

        euint8 a0 = _normalizeAnswer(0, FHE.fromExternal(q0, inputProof));
        euint8 a1 = _normalizeAnswer(1, FHE.fromExternal(q1, inputProof));
        euint8 a2 = _normalizeAnswer(2, FHE.fromExternal(q2, inputProof));
        euint8 a3 = _normalizeAnswer(3, FHE.fromExternal(q3, inputProof));
        euint8 a4 = _normalizeAnswer(4, FHE.fromExternal(q4, inputProof));

        _storeChoiceAndCount(0, a0);
        _storeChoiceAndCount(1, a1);
        _storeChoiceAndCount(2, a2);
        _storeChoiceAndCount(3, a3);
        _storeChoiceAndCount(4, a4);

        _hasSubmitted[msg.sender] = true;
        emit AnswersSubmitted(msg.sender);
    }

    /// @notice Grants `viewer` access to all tally ciphertexts, enabling user-decryption of stats.
    /// @dev This does not grant access to any user's private answers.
    function allowCounts(address viewer) external {
        require(viewer != address(0), "Invalid viewer");

        for (uint8 q = 0; q < QUESTION_COUNT; q++) {
            for (uint8 o = 0; o < MAX_OPTIONS; o++) {
                euint32 c = _counts[q][o];
                if (euint32.unwrap(c) != bytes32(0)) {
                    FHE.allow(c, viewer);
                }
            }
        }
    }

    function _storeChoiceAndCount(uint8 questionIndex, euint8 answer) internal {
        _choices[msg.sender][questionIndex] = answer;

        FHE.allowThis(_choices[msg.sender][questionIndex]);
        FHE.allow(_choices[msg.sender][questionIndex], msg.sender);

        _incrementCounts(questionIndex, answer);
    }

    function _incrementCounts(uint8 questionIndex, euint8 answer) internal {
        euint32 one = FHE.asEuint32(1);
        euint32 zero = FHE.asEuint32(0);

        for (uint8 o = 0; o < MAX_OPTIONS; o++) {
            ebool isSelected = FHE.eq(answer, FHE.asEuint8(o));
            euint32 inc = FHE.select(isSelected, one, zero);

            _counts[questionIndex][o] = FHE.add(_counts[questionIndex][o], inc);
            FHE.allowThis(_counts[questionIndex][o]);
        }
    }

    function _normalizeAnswer(uint8 questionIndex, euint8 raw) internal returns (euint8) {
        uint8 optionCount = optionCountForQuestion(questionIndex);
        ebool inRange = FHE.lt(raw, optionCount);
        return FHE.select(inRange, raw, FHE.asEuint8(0));
    }
}
