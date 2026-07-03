declare module "circomlibjs" {
  type Poseidon = {
    (inputs: bigint[]): unknown;
    F: {
      toString: (value: unknown) => string;
    };
  };

  export function buildPoseidon(): Promise<Poseidon>;
}

declare module "snarkjs" {
  export const groth16: {
    exportSolidityCallData: (proof: unknown, publicSignals: unknown[]) => Promise<string>;
    fullProve: <TInput extends Record<string, unknown>>(input: TInput, wasmFile: string, zkeyFile: string) => Promise<{
      proof: unknown;
      publicSignals: unknown[];
    }>;
  };
}
