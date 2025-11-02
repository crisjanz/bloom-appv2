import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const SeasonalProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeasonalProducts = async () => {
      try {
        const response = await api.get('/settings/homepage');
        if (response?.seasonalProducts && Array.isArray(response.seasonalProducts)) {
          setProducts(response.seasonalProducts.filter(p => p.customTitle || p.productId));
        }
      } catch (error) {
        console.error('Error fetching seasonal products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonalProducts();
  }, []);

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-10 dark:bg-dark lg:py-20">
      <div className="container mx-auto">
        <div className="-mx-4 flex flex-wrap">
          <div className="w-full px-4">
            <div className="mx-auto mb-[60px] max-w-[620px] text-center lg:mb-20">
              <h2 className="mb-4 text-3xl font-bold text-dark dark:text-white sm:text-4xl md:text-[40px] md:leading-[1.2]">
                Seasonal Collections
              </h2>
              <span className="mx-auto mb-[18px] block h-[3px] w-[100px] bg-primary"></span>
            </div>
          </div>
        </div>

        <div className="-mx-4 flex flex-wrap">
          {products.map((product, index) => (
            <div key={index} className="w-full px-4 md:w-1/2">
              <div className="relative mb-8 overflow-hidden rounded-lg">
                <img
                  src={product.customImageUrl}
                  alt={product.customTitle}
                  className="w-full h-96 object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
                  <div className="text-white">
                    {product.customSubtitle && (
                      <p className="mb-2 text-sm font-medium">{product.customSubtitle}</p>
                    )}
                    <h3 className="mb-3 text-2xl font-bold">{product.customTitle}</h3>
                    {product.customDescription && (
                      <p className="mb-4 text-sm opacity-90">{product.customDescription}</p>
                    )}
                    <Link
                      to={product.buttonLink || '#'}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-7 py-3 text-center text-base font-medium text-white hover:bg-primary-dark"
                    >
                      {product.buttonText || 'View All Items'}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SeasonalProducts;
