import React, { useEffect, useState } from "react";
import { Typography, List, Avatar, Skeleton, Button } from "antd";
import { ethers } from "ethers";

import { AddressInput } from "../components";
import { useRef } from "react";

const { Title, Paragraph } = Typography;

function Home({ _address, readContracts, localProvider, mainnetProvider }) {
  const [tokenList, setTokenList] = useState([]);
  const [tokenURIs, setTokenURIs] = useState([]);
  const [address, setAddress] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState(undefined);
  // const [, setBalance] = useState(undefined);
  const LOAD_COUNT = 5;
  const pageCountRef = useRef(0);

  const loadNFTs = async () => {
    let balance = await readContracts["casterContract"].balanceOf(address);
    setBalance(balance.toString());
    const filterTo = readContracts["casterContract"].filters.Transfer(null, address);
    const filterFrom = readContracts["casterContract"].filters.Transfer(address);

    const queryEventsTo = await readContracts["casterContract"].queryFilter(filterTo);
    const queryEventsFrom = await readContracts["casterContract"].queryFilter(filterFrom);
    // console.log(`n-🔴 => loadNFTs => queryEventsFrom`, queryEventsFrom);

    const logs = queryEventsFrom
      .concat(queryEventsTo)
      .sort((a, b) => a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex);

    const owned = new Set();

    for (const {
      args: { from, to, tokenId },
    } of logs) {
      if (addressEqual(to, address)) {
        owned.add(tokenId.toString());
      } else if (addressEqual(from, address)) {
        owned.delete(tokenId.toString());
      }
    }

    function addressEqual(a, b) {
      return a.toLowerCase() === b.toLowerCase();
    }

    const tokenURIs = [...owned];
    setTokenURIs(tokenURIs);
  };

  useEffect(() => {
    if (
      address !== undefined &&
      ethers.utils.isAddress(address) &&
      localProvider &&
      "casterContract" in readContracts &&
      "shadowNFT" in readContracts
    ) {
      setIsLoading(true);
      void loadNFTs();
    }

    if (!address) {
      setTokenList([]);
    }
  }, [localProvider, readContracts, address]);

  useEffect(() => {
    if (tokenURIs.length > 0) {
      void onLoadMore();
    }
  }, [tokenURIs]);

  const onLoadMore = async () => {
    const tokenData = [];
    setIsLoading(true);

    const fromIndex = pageCountRef.current === 0 ? pageCountRef.current : pageCountRef.current + 1;
    const toIndex = pageCountRef.current + LOAD_COUNT;

    for (const tokenURI of tokenURIs.slice(fromIndex, toIndex + 1)) {
      let rawData;
      try {
        rawData = await readContracts["shadowNFT"].tokenURI(tokenURI);

        rawData = rawData.replace("data:application/json;charset=utf-8,", "");
        let jsonData = JSON.parse(rawData);
        jsonData.loading = false;

        tokenData.push(jsonData);
      } catch (error) {
        console.log(`n-🔴 => loadNFTs => error`, error);
        continue;
      }
    }

    setTokenList(prev => [...prev, ...tokenData]);
    setIsLoading(false);
    pageCountRef.current = pageCountRef.current + LOAD_COUNT;
  };

  const loadMore = !isLoading ? (
    <div
      className={`text-center m-5 ${
        balance <= 5 || balance === undefined || balance <= pageCountRef.current ? "hidden" : "visible"
      }`}
    >
      <Button onClick={onLoadMore}>loading more</Button>
    </div>
  ) : null;

  return (
    <div className="flex flex-col items-center ">
      <div className="w-1/2">
        <Title level={2}>Invisible NFT's</Title>
        <Paragraph className="opacity-70">
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Non deleniti, vitae quo cumque, laboriosam minus
          iste illo, dolores consequatur at quibusdam! Praesentium veniam eum hic dicta optio doloremque obcaecati
          tenetur!
        </Paragraph>
      </div>

      <div className="w-1/2 mt-5">
        <AddressInput
          placeholder="enter ens address"
          autoFocus
          ensProvider={mainnetProvider}
          address={address}
          onChange={setAddress}
        />
        {balance !== undefined && (
          <div className="mt-2">
            <span className="opacity-60">{balance} invisible nft's found</span>
          </div>
        )}
      </div>

      <div className="w-1/2 mt-10">
        <List
          itemLayout="horizontal"
          size="large"
          dataSource={tokenList}
          loadMore={loadMore}
          loading={isLoading}
          renderItem={item => (
            <Skeleton avatar title={"loading"} loading={item.loading} active>
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar size={120} src={item.image} />}
                  title={<div className="mt-3">{item.name}</div>}
                  description={item.description}
                />
              </List.Item>
            </Skeleton>
          )}
        />
      </div>
    </div>
  );
}

export default Home;
