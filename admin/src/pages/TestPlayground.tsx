import PageBreadcrumb from "../components/common/PageBreadCrumb";
import AppLayout from "../layout/AppLayout";
import ProductInputs from "../components/form/form-elements/ProductInputs";
import ProductSideInputs from "../components/form/form-elements/ProductSideInputs";




const TestPlayground = () => {
  return (
    
    <div>
	<PageBreadcrumb pageTitle="New Product" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-0">
        {/* Main Column (2/3 width) */}

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <ProductInputs />
          </div>
        </div>
        {/* Sidebar Column (1/3 width) */}
        <div className="space-y-6">
          <div className="card p-6">
            <ProductSideInputs />
            <h2 className="text-lg font-semibold mb-4">Settings</h2>

            <label className="block text-sm font-medium mb-1">Status</label>
            <select className="form-select w-full mb-4">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>

            <label className="block text-sm font-medium mb-1">Visibility</label>
            <select className="form-select w-full mb-4">
              <option value="ONLINE">ONLINE</option>
              <option value="POS">POS</option>
              <option value="BOTH">BOTH</option>
            </select>

            <label className="block text-sm font-medium mb-1">Taxable</label>
            <input type="checkbox" className="form-checkbox" />
          </div>

          <div className="card p-6">
            <button className="btn btn-primary w-full">Save Product</button>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default TestPlayground;