import { create } from 'zustand';

export interface SimulacaoData {
  valor_imovel: number | '';
  renda_bruta_familiar: number | '';
  prazo_meses: number;
  sistema_amortizacao: 'SAC' | 'PRICE';
  tem_3_anos_fgts: boolean;
  tem_dependente: boolean;
  saldo_fgts: number | '';
  regiao_imovel: string;
  subsidio_maximo_municipio: number | '';
  idade_comprador_principal: number | '';
  entrada_preferencial_usuario: number | '';
}

interface SimuladorState {
  data: SimulacaoData;
  result: any;
  loading: boolean;
  error: string;
  step: number;
  updateData: (newData: Partial<SimulacaoData>) => void;
  setResult: (res: any) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string) => void;
  setStep: (s: number) => void;
  reset: () => void;
}

const initialState: SimulacaoData = {
  valor_imovel: '',
  renda_bruta_familiar: '',
  prazo_meses: 420,
  sistema_amortizacao: 'SAC',
  tem_3_anos_fgts: false,
  tem_dependente: false,
  saldo_fgts: '',
  regiao_imovel: 'Sudeste',
  subsidio_maximo_municipio: 55000,
  idade_comprador_principal: 30,
  entrada_preferencial_usuario: ''
};

export const useSimuladorStore = create<SimuladorState>((set) => ({
  data: initialState,
  result: null,
  loading: false,
  error: '',
  step: 1,
  updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
  setResult: (res) => set({ result: res }),
  setLoading: (l) => set({ loading: l }),
  setError: (e) => set({ error: e }),
  setStep: (s) => set({ step: s }),
  reset: () => set({ data: initialState, result: null, step: 1, error: '', loading: false })
}));
