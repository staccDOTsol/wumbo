import React, { useEffect, useMemo, useState } from "react";
import ReactShadow from "react-shadow/emotion";
// @ts-ignore
import compareImages from "resemblejs/compareImages";
import axios from "axios";
import { useAsync, useAsyncCallback } from "react-async-hook";
import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmRawTransaction,
} from "@solana/web3.js";
import { VStack, HStack, Box, Text, Checkbox, Button } from "@chakra-ui/react";
import {
  useAccountFetchCache,
  useErrorHandler,
  useProvider,
} from "@strata-foundation/react";
import {
  NFT_VERIFIER_URL,
  getNftNameRecordKey,
  truthy,
  ThemeProvider,
  Spinner,
  FloatPortal,
  useConfig,
} from "../";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

interface ITagArgs {
  imgUrls: string[];
  tokenMetadata: string;
  feePayer: string;
}

export const getBufferFromUrl = async (
  url: string | undefined
): Promise<Blob | undefined> => {
  if (url) {
    const response = await axios.get(url, { responseType: "blob" });
    return response.data;
  }
};

const tag = async (
  connection: Connection,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  args: ITagArgs
): Promise<void> => {
  try {
    const resp = await axios.post(NFT_VERIFIER_URL + "/verify", args, {
      responseType: "json",
    });
    const tx = Transaction.from(resp.data.data);
    const signed = await signTransaction(tx);
    await sendAndConfirmRawTransaction(connection, signed.serialize());
  } catch (e: any) {
    if (e.response?.data?.message) {
      throw new Error(e.response.data.message);
    }
    throw e;
  }
};

export const TaggableImage = React.memo(
  ({
    percent,
    selected,
    onSelect,
    src,
    images,
  }: {
    percent: number;
    selected: boolean;
    onSelect: () => void;
    src: string;
    images: HTMLImageElement[];
  }) => {
    const [hovering, setHovering] = useState(false);

    const handleSelect = () => {
      onSelect();
    };

    return (
      <HStack
        spacing={4}
        padding={4}
        bgColor="gray.100"
        rounded="lg"
        _hover={{ cursor: "pointer", bgColor: "gray.200" }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSelect();
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {selected &&
          images.map((image) => (
            <FloatPortal container={image} clearance={{}}>
              <ReactShadow.div>
                <ThemeProvider>
                  <Box
                    backgroundColor="#00CE90"
                    background="repeating-linear-gradient(45deg, #4239B1, #4239B1 2px, #00CE90 2px, #00CE90 20px )"
                    borderRadius="999px"
                    opacity={0.5}
                    width={image.height + "px"}
                    height={image.height + "px"}
                  />
                </ThemeProvider>
              </ReactShadow.div>
            </FloatPortal>
          ))}
        {hovering &&
          images.map((image) => (
            <FloatPortal container={image} clearance={{}}>
              <ReactShadow.div>
                <ThemeProvider>
                  <Box
                    backgroundColor="#4239B1"
                    borderRadius="999px"
                    opacity={0.5}
                    width={image.height + "px"}
                    height={image.height + "px"}
                  />
                </ThemeProvider>
              </ReactShadow.div>
            </FloatPortal>
          ))}
        <Checkbox
          name={src}
          isChecked={selected}
          borderColor="gray.700"
          size="lg"
          colorScheme="indigo"
        />
        <VStack alignItems="left" lineHeight="none" overflow="hidden">
          <Text fontWeight="medium" isTruncated>
            {src}
          </Text>
        </VStack>
      </HStack>
    );
  }
);

export function getUntaggedImages(): HTMLImageElement[] {
  const nonWumNodes = [...document.body.children].filter(
    (c) => c.id != "WUM" && c.id != "headlessui-portal-root"
  );
  return nonWumNodes.flatMap((n) => [
    ...n.querySelectorAll("img:not(.nft-tagged)"),
  ]) as HTMLImageElement[];
}

export function useBufferFromUrl(url: string): {
  result: Blob | undefined;
  error?: Error;
} {
  return useAsync(getBufferFromUrl, [url]);
}

type TagMatch = { percent: number; els: HTMLImageElement[] };
export const TaggableImages = ({
  metadata,
  src,
  refreshCounter,
}: {
  metadata: PublicKey;
  src: string;
  refreshCounter: number;
}) => {
  const { connection } = useConnection();
  const images = useMemo(() => getUntaggedImages(), [refreshCounter]);
  const { result: img1, error: bufferError } = useBufferFromUrl(src);
  const [matches, setMatches] = useState<Record<string, TagMatch>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [allSelected, setAllSelected] = useState<boolean>(false);
  const { publicKey, signTransaction } = useWallet();
  const { awaitingApproval } = useProvider();
  const { handleErrors } = useErrorHandler();

  handleErrors(bufferError, error);
  const cache = useAccountFetchCache();

  const handleSetSelected = (src: string) => {
    setSelected((s) => {
      const wasSelected = !!s[src];

      if (wasSelected) {
        setAllSelected(false);
      }

      if (!wasSelected) {
        // check if all other matches are selected
        // if so mark all selected
        const refObj = Object.entries(matches).reduce(
          (acc, [src]) => ({ ...acc, [src]: true }),
          {}
        );
        if (
          JSON.stringify(refObj) ===
          JSON.stringify({ ...selected, [src]: !wasSelected })
        ) {
          setAllSelected(true);
        }
      }

      return { ...s, [src]: !wasSelected };
    });
  };

  const tagAll = async () => {
    const imgUrls = Object.entries(selected)
      .filter(([_, isSelected]) => isSelected)
      .map(([key]) => key);

    await tag(connection, signTransaction!, {
      imgUrls,
      tokenMetadata: metadata.toBase58(),
      feePayer: publicKey!.toBase58(),
    });

    setSelected({});
    setMatches((matches) => {
      imgUrls.forEach((url) => {
        delete matches[url];
      });

      return matches;
    });
  };

  const {
    execute,
    loading: executing,
    error: executeError,
  } = useAsyncCallback(tagAll);
  handleErrors(executeError);

  useEffect(() => {
    if (allSelected) {
      setSelected(
        Object.entries(matches).reduce(
          (acc, [src]) => ({
            ...acc,
            [src]: true,
          }),
          {}
        )
      );
    }

    if (!allSelected) {
      setSelected({});
    }
  }, [allSelected, matches, setSelected]);

  const config = useConfig();

  useEffect(() => {
    (async () => {
      if (img1) {
        try {
          setLoading(true);
          const imagesBySrc = images.reduce((acc, img) => {
            acc[img.src] = acc[img.src] || [];
            acc[img.src].push(img);

            return acc;
          }, {} as Record<string, HTMLImageElement[]>);
          const newMatches = (
            await Promise.all(
              Object.entries(imagesBySrc).map(async ([img2Src, images]) => {
                const key = await getNftNameRecordKey(
                  img2Src,
                  config.verifiers.nftVerifier,
                  config.tlds.nftVerifier
                );
                const alreadyExists = await cache?.search(key, undefined, true);

                if (!alreadyExists) {
                  const img2 = await getBufferFromUrl(img2Src);
                  const mismatchPercent = +(
                    await compareImages(img1, img2, { scaleToSameSize: true })
                  ).misMatchPercentage;
                  if (mismatchPercent <= config.nftMismatchThreshold) {
                    return [
                      img2Src,
                      {
                        percent: mismatchPercent,
                        els: images,
                      },
                    ] as readonly [string, TagMatch];
                  }
                }

                return null;
              })
            )
          )
            .filter(truthy)
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {} as Record<string, TagMatch>);

          setMatches(() => newMatches);
        } catch (err: any) {
          setError(err);
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [cache, img1, images]);

  return (
    <VStack width="full" spacing={4} padding={4} alignItems="center">
      {loading && <Spinner size="lg" />}
      {!loading && Object.entries(matches).length > 0 && (
        <VStack w="full" spacing={4} alignItems="left">
          <HStack
            spacing={4}
            padding={4}
            bgColor="gray.100"
            rounded="lg"
            _hover={{ cursor: "pointer", bgColor: "gray.200" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAllSelected(!allSelected);
            }}
          >
            <Checkbox
              name="selectAll"
              isChecked={allSelected}
              borderColor="gray.700"
              size="lg"
              colorScheme="indigo"
            />
            <VStack alignItems="left" lineHeight="none" overflow="hidden">
              <Text fontWeight="medium">
                {`${allSelected ? "De" : ""}Select All`}
              </Text>
            </VStack>
          </HStack>
          {Object.entries(matches)
            .sort(
              ([k1, { percent: percent1 }], [k2, { percent: percent2 }]) =>
                percent1 - percent2
            )
            .map(([src, { els, percent }]) => (
              <TaggableImage
                key={src}
                src={src}
                percent={percent}
                images={els}
                onSelect={() => handleSetSelected(src)}
                selected={!!selected[src]}
              />
            ))}
        </VStack>
      )}
      {!loading && Object.entries(matches).length === 0 && (
        <div>No Matches found to link</div>
      )}
      <Button
        width="full"
        colorScheme="indigo"
        onClick={execute}
        disabled={executing || Object.entries(matches).length === 0}
        isLoading={executing}
        loadingText={awaitingApproval ? "Awaiting Approval" : "Tagging"}
      >
        {loading ? "Searching..." : "Verify"}
      </Button>
    </VStack>
  );
};
