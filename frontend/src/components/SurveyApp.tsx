import { useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, useChainId, usePublicClient, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { isAddress, zeroAddress } from 'viem';
import { Header } from './Header';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/SurveyApp.css';

type SurveyQuestion = {
  id: number;
  title: string;
  options: string[];
};

type PersonalityReport = {
  title: string;
  summary: string;
  traits: Array<{ label: string; value: string }>;
  tips: string[];
};

const QUESTIONS: SurveyQuestion[] = [
  {
    id: 0,
    title: 'When you start something new, you prefer to:',
    options: ['Plan first and then execute', 'Start quickly and iterate'],
  },
  {
    id: 1,
    title: 'In a group discussion, you usually:',
    options: ['Speak early', 'Listen first then share', 'Only speak if asked'],
  },
  {
    id: 2,
    title: 'When making decisions, you rely most on:',
    options: ['Data and evidence', 'Values and principles', 'Intuition and creativity', 'Consensus and alignment'],
  },
  {
    id: 3,
    title: 'You recharge best by:',
    options: ['Quiet time alone', 'Spending time with others'],
  },
  {
    id: 4,
    title: 'Under pressure, you tend to:',
    options: ['Stay calm and steady', 'Get energized and act fast', 'Look for structure and clear steps'],
  },
];

function buildReport(answers: number[]): PersonalityReport {
  const planStyle = answers[0] === 0 ? 'Planner' : 'Adapter';
  const discussionStyle = answers[1] === 0 ? 'Direct' : answers[1] === 1 ? 'Thoughtful' : 'Selective';
  const decisionStyle =
    answers[2] === 0
      ? 'Analytical'
      : answers[2] === 1
        ? 'Values-led'
        : answers[2] === 2
          ? 'Intuitive'
          : 'Consensus-driven';
  const recharge = answers[3] === 0 ? 'Solo-recharge' : 'Social-recharge';
  const stressStyle = answers[4] === 0 ? 'Calm' : answers[4] === 1 ? 'Energized' : 'Structured';

  const title =
    planStyle === 'Planner' && recharge === 'Solo-recharge'
      ? 'The Strategic Builder'
      : planStyle === 'Planner' && recharge === 'Social-recharge'
        ? 'The Coordinated Leader'
        : planStyle === 'Adapter' && recharge === 'Solo-recharge'
          ? 'The Independent Explorer'
          : 'The Dynamic Connector';

  const tips: string[] = [];
  if (planStyle === 'Planner') tips.push('Leave room for experimentation so plans stay flexible.');
  if (planStyle === 'Adapter') tips.push('Add lightweight checkpoints to keep iteration focused.');
  if (decisionStyle === 'Analytical') tips.push('Pair data with a clear value statement to avoid over-optimizing.');
  if (decisionStyle === 'Values-led') tips.push('Sanity-check priorities with one concrete metric.');
  if (decisionStyle === 'Intuitive') tips.push('Capture assumptions early so others can follow your reasoning.');
  if (decisionStyle === 'Consensus-driven') tips.push('Timebox alignment to avoid slow decisions.');
  if (stressStyle === 'Calm') tips.push('Communicate your plan during pressure so others stay aligned.');
  if (stressStyle === 'Energized') tips.push('Pause briefly before acting to reduce rework.');
  if (stressStyle === 'Structured') tips.push('Start with the smallest actionable step to regain momentum.');

  return {
    title,
    summary: `You show a ${planStyle.toLowerCase()} approach with a ${discussionStyle.toLowerCase()} communication style. Your decisions are mainly ${decisionStyle.toLowerCase()}, you tend to ${recharge.toLowerCase().replace('-', ' ')}, and under pressure you are typically ${stressStyle.toLowerCase()}.`,
    traits: [
      { label: 'Approach', value: planStyle },
      { label: 'Discussion', value: discussionStyle },
      { label: 'Decisions', value: decisionStyle },
      { label: 'Recharge', value: recharge },
      { label: 'Pressure', value: stressStyle },
    ],
    tips,
  };
}

export function SurveyApp() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [activeTab, setActiveTab] = useState<'survey' | 'result' | 'stats'>('survey');
  const [answers, setAnswers] = useState<Array<number | null>>(() => QUESTIONS.map(() => null));
  const [contractAddressInput, setContractAddressInput] = useState<string>(CONTRACT_ADDRESS);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedAnswers, setDecryptedAnswers] = useState<number[] | null>(null);
  const [decryptError, setDecryptError] = useState<string>('');

  const [statsQuestion, setStatsQuestion] = useState(0);
  const [isDecryptingStats, setIsDecryptingStats] = useState(false);
  const [statsCounts, setStatsCounts] = useState<number[] | null>(null);
  const [statsError, setStatsError] = useState<string>('');

  const contractAddress = isAddress(contractAddressInput) ? (contractAddressInput as `0x${string}`) : null;
  const isContractConfigured = contractAddress !== null && contractAddress !== zeroAddress;
  const readAddress = contractAddress ?? zeroAddress;

  const { data: hasSubmitted } = useReadContract({
    address: readAddress,
    abi: CONTRACT_ABI,
    functionName: 'hasSubmitted',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress && isContractConfigured,
    },
  });

  const report = useMemo(() => (decryptedAnswers ? buildReport(decryptedAnswers) : null), [decryptedAnswers]);

  const isOnSepolia = chainId === sepolia.id;
  const canSubmit =
    !!address && isOnSepolia && isContractConfigured && hasSubmitted !== true && answers.every((a) => a !== null);

  const submit = async () => {
    setSubmitError('');
    setTxHash('');

    if (!address) {
      setSubmitError('Connect a wallet to continue.');
      return;
    }
    if (!isOnSepolia) {
      setSubmitError('Switch your wallet to Sepolia.');
      return;
    }
    if (!isContractConfigured || !contractAddress) {
      setSubmitError('Set the deployed contract address first.');
      return;
    }
    if (!instance || zamaLoading || zamaError) {
      setSubmitError('Encryption service is not ready.');
      return;
    }
    if (!signerPromise) {
      setSubmitError('Signer is not available.');
      return;
    }
    if (!answers.every((a) => a !== null)) {
      setSubmitError('Please answer all questions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const input = instance.createEncryptedInput(contractAddress, address);
      for (const a of answers as number[]) input.add8(a);
      const encryptedInput = await input.encrypt();

      const signer = await signerPromise;
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      setIsConfirming(true);
      const tx = await contract.submitAnswers(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.handles[4],
        encryptedInput.inputProof,
      );

      setTxHash(tx.hash);
      await tx.wait();
      setIsConfirming(false);
      setActiveTab('result');
    } catch (e) {
      setIsConfirming(false);
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit answers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const decryptMyAnswers = async () => {
    setDecryptError('');
    setDecryptedAnswers(null);

    if (!address) {
      setDecryptError('Connect a wallet to continue.');
      return;
    }
    if (!isOnSepolia) {
      setDecryptError('Switch your wallet to Sepolia.');
      return;
    }
    if (!isContractConfigured || !contractAddress) {
      setDecryptError('Set the deployed contract address first.');
      return;
    }
    if (hasSubmitted !== true) {
      setDecryptError('You have not submitted the survey yet.');
      return;
    }
    if (!publicClient) {
      setDecryptError('Read client is not available.');
      return;
    }
    if (!instance || zamaLoading || zamaError) {
      setDecryptError('Encryption service is not ready.');
      return;
    }
    if (!signerPromise) {
      setDecryptError('Signer is not available.');
      return;
    }

    setIsDecrypting(true);
    try {
      const handles = await Promise.all(
        QUESTIONS.map((q) =>
          publicClient.readContract({
            address: contractAddress,
            abi: CONTRACT_ABI,
            functionName: 'getEncryptedChoice',
            args: [address, q.id],
          }),
        ),
      );

      const keypair = instance.generateKeypair();
      const handleContractPairs = handles.map((handle) => ({
        handle: handle as string,
        contractAddress: contractAddress,
      }));

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [contractAddress];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signer = await signerPromise;
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const clear = handles.map((handle) => {
        const value = result[handle as string] ?? '0';
        return Number.parseInt(value, 10);
      });

      setDecryptedAnswers(clear);
    } catch (e) {
      setDecryptError(e instanceof Error ? e.message : 'Failed to decrypt answers.');
    } finally {
      setIsDecrypting(false);
    }
  };

      const decryptStats = async () => {
    setStatsError('');
    setStatsCounts(null);

    if (!address) {
      setStatsError('Connect a wallet to continue.');
      return;
    }
    if (!isOnSepolia) {
      setStatsError('Switch your wallet to Sepolia.');
      return;
    }
    if (!isContractConfigured || !contractAddress) {
      setStatsError('Set the deployed contract address first.');
      return;
    }
    if (!publicClient) {
      setStatsError('Read client is not available.');
      return;
    }
    if (!instance || zamaLoading || zamaError) {
      setStatsError('Encryption service is not ready.');
      return;
    }
    if (!signerPromise) {
      setStatsError('Signer is not available.');
      return;
    }

    setIsDecryptingStats(true);
    try {
      const signer = await signerPromise;
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);
      await (await contract.allowCounts(address)).wait();

      const countHandles = await Promise.all(
        [0, 1, 2, 3].map((o) =>
          publicClient.readContract({
            address: contractAddress,
            abi: CONTRACT_ABI,
            functionName: 'getEncryptedCount',
            args: [statsQuestion, o],
          }),
        ),
      );

      const keypair = instance.generateKeypair();
      const handleContractPairs = countHandles.map((handle) => ({
        handle: handle as string,
        contractAddress: contractAddress,
      }));

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [contractAddress];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const clear = countHandles.map((handle) => {
        const value = result[handle as string] ?? '0';
        return Number.parseInt(value, 10);
      });
      setStatsCounts(clear);
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : 'Failed to decrypt stats.');
    } finally {
      setIsDecryptingStats(false);
    }
  };

  return (
    <div className="survey-app">
      <Header />
      <main className="survey-main">
        <div className="survey-card">
          <div className="survey-tabs">
            <button
              className={`survey-tab ${activeTab === 'survey' ? 'active' : 'inactive'}`}
              onClick={() => setActiveTab('survey')}
            >
              Survey
            </button>
            <button
              className={`survey-tab ${activeTab === 'result' ? 'active' : 'inactive'}`}
              onClick={() => setActiveTab('result')}
            >
              My Result
            </button>
            <button
              className={`survey-tab ${activeTab === 'stats' ? 'active' : 'inactive'}`}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </button>
          </div>

          {!address && (
            <div className="survey-banner">
              <div className="survey-banner-title">Connect your wallet</div>
              <div className="survey-banner-text">Your answers are encrypted and stored on Sepolia.</div>
            </div>
          )}

          {address && !isOnSepolia && (
            <div className="survey-banner warning">
              <div className="survey-banner-title">Wrong network</div>
              <div className="survey-banner-text">Switch your wallet network to Sepolia.</div>
            </div>
          )}

          {zamaError && (
            <div className="survey-banner warning">
              <div className="survey-banner-title">Encryption service error</div>
              <div className="survey-banner-text">{zamaError}</div>
            </div>
          )}

          <div className="survey-section">
            <div className="config-card">
              <div className="config-title">Contract</div>
              <div className="config-row">
                <input
                  className="config-input"
                  value={contractAddressInput}
                  onChange={(e) => setContractAddressInput(e.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                />
              </div>
              {!isAddress(contractAddressInput) && (
                <div className="config-hint warning">Enter a valid EVM address.</div>
              )}
              {isAddress(contractAddressInput) && contractAddressInput === zeroAddress && (
                <div className="config-hint warning">Set the deployed contract address (not the zero address).</div>
              )}
              {isContractConfigured && (
                <div className="config-hint">Using contract: {contractAddressInput}</div>
              )}
              {!isContractConfigured && isAddress(contractAddressInput) && contractAddressInput !== zeroAddress && (
                <div className="config-hint warning">
                  This address is formatted correctly, but make sure it is the deployed EncryptedPersonalitySurvey
                  contract.
                </div>
              )}
            </div>
          </div>

          {activeTab === 'survey' && (
            <div className="survey-section">
              <h2 className="survey-title">Answer 5 quick questions</h2>
              <p className="survey-subtitle">
                Your selections are encrypted client-side and submitted on-chain. The contract also keeps encrypted
                tallies.
              </p>

              {!!hasSubmitted && (
                <div className="survey-banner success">
                  <div className="survey-banner-title">Already submitted</div>
                  <div className="survey-banner-text">You can decrypt your answers in the “My Result” tab.</div>
                </div>
              )}

              <div className="survey-questions">
                {QUESTIONS.map((q) => (
                  <div key={q.id} className="question-card">
                    <div className="question-title">
                      {q.id + 1}. {q.title}
                    </div>
                    <div className="question-options">
                      {q.options.map((label, idx) => {
                        const selected = answers[q.id] === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`option-button ${selected ? 'selected' : ''}`}
                            onClick={() =>
                              setAnswers((prev) => {
                                const next = [...prev];
                                next[q.id] = idx;
                                return next;
                              })
                            }
                            disabled={!!hasSubmitted}
                          >
                            <span className="option-indicator">{selected ? '●' : '○'}</span>
                            <span className="option-label">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {submitError && <div className="survey-error">{submitError}</div>}

              <button
                className="primary-button"
                type="button"
                disabled={!canSubmit || isSubmitting || isConfirming || zamaLoading}
                onClick={submit}
              >
                {zamaLoading ? 'Preparing encryption…' : isConfirming ? 'Confirming…' : 'Encrypt & Submit'}
              </button>

              {txHash && (
                <div className="tx-hash">
                  Transaction: <code>{txHash}</code>
                </div>
              )}
            </div>
          )}

          {activeTab === 'result' && (
            <div className="survey-section">
              <h2 className="survey-title">My result</h2>
              <p className="survey-subtitle">Decrypt your private answers and generate your personality report.</p>

              {decryptError && <div className="survey-error">{decryptError}</div>}

              <button
                className="primary-button"
                type="button"
                disabled={!address || !isOnSepolia || isDecrypting || zamaLoading}
                onClick={decryptMyAnswers}
              >
                {isDecrypting ? 'Decrypting…' : 'Decrypt My Answers'}
              </button>

              {report && (
                <div className="result-card">
                  <div className="result-title">{report.title}</div>
                  <div className="result-summary">{report.summary}</div>

                  <div className="result-grid">
                    {report.traits.map((t) => (
                      <div key={t.label} className="result-trait">
                        <div className="result-trait-label">{t.label}</div>
                        <div className="result-trait-value">{t.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="result-tips-title">Action tips</div>
                  <ul className="result-tips">
                    {report.tips.slice(0, 6).map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="survey-section">
              <h2 className="survey-title">Encrypted on-chain tallies</h2>
              <p className="survey-subtitle">
                Tallies are stored encrypted. You can grant yourself access and decrypt them client-side.
              </p>

              <div className="stats-controls">
                <label className="stats-label" htmlFor="statsQuestion">
                  Question
                </label>
                <select
                  id="statsQuestion"
                  className="stats-select"
                  value={statsQuestion}
                  onChange={(e) => setStatsQuestion(Number.parseInt(e.target.value, 10))}
                >
                  {QUESTIONS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.id + 1}
                    </option>
                  ))}
                </select>
              </div>

              {statsError && <div className="survey-error">{statsError}</div>}

              <button
                className="primary-button"
                type="button"
                disabled={!address || !isOnSepolia || isDecryptingStats || zamaLoading}
                onClick={decryptStats}
              >
                {isDecryptingStats ? 'Decrypting…' : 'Decrypt Tallies'}
              </button>

              {statsCounts && (
                <div className="stats-card">
                  <div className="stats-title">
                    Question {statsQuestion + 1}: {QUESTIONS[statsQuestion].title}
                  </div>
                  <div className="stats-bars">
                    {QUESTIONS[statsQuestion].options.map((label, idx) => {
                      const count = statsCounts[idx] ?? 0;
                      const max = Math.max(...statsCounts.slice(0, QUESTIONS[statsQuestion].options.length), 1);
                      const width = Math.round((count / max) * 100);
                      return (
                        <div key={idx} className="stats-row">
                          <div className="stats-row-label">{label}</div>
                          <div className="stats-row-bar">
                            <div className="stats-row-bar-fill" style={{ width: `${width}%` }} />
                          </div>
                          <div className="stats-row-count">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
