import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProducts = [...cart];
      const productExists = cartProducts.find(product => product.id === productId);
      const stockProduct = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);

      const currentAmount = productExists ? productExists.amount : 0;

      const amount = currentAmount + 1;

      if (amount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get<Product>(`/products/${productId}`).then(response => response.data);

        const newProduct = {
          ...product,
          amount: 1,
        }

        cartProducts.push(newProduct);
      }

      setCart(cartProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartProducts));
    } catch (err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.findIndex(
        (product) => product.id === productId
      );
      
      if(productExists < 0) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const filteredProducts = cart.filter(product => product.id !== productId);

      setCart(filteredProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredProducts));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockProduct = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);

      if (amount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const cartProducts = [...cart];
      const updatedProduct = cartProducts.find(product => product.id === productId);

      if (updatedProduct) {
        updatedProduct.amount = amount;
        setCart(cartProducts);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartProducts));
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
