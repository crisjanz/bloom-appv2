import { useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import TextArea from "../input/TextArea";
import Select from "../Select";
import { EyeCloseIcon, EyeIcon, TimeIcon } from "@shared/assets/icons";
import DatePicker from "../date-picker.tsx";

export default function ProductInputs() {
  const [showPassword, setShowPassword] = useState(false);
  const options = [
    { value: "marketing", label: "Marketing" },
    { value: "template", label: "Template" },
    { value: "development", label: "Development" },
  ];
  const handleSelectChange = (value: string) => {
    console.log("Selected value:", value);
  };

  return (
    <ComponentCard title="Product Info">
      <div class="space-y-6 flex flex-wrap">
        <div class="w-full px-2.5">
          <Label htmlFor="input">Product Name</Label>
          <Input type="text" id="input" />
        </div>

<div class="w-full px-2.5">
          <Label>Description</Label>
          <TextArea placeholder="Enter Product Description" rows="6"/>
        </div>

          
<div class="w-full px-2.5">
<Label htmlFor="input">Upload Product Images</Label>
<form class="dropzone text-center hover:border-brand-500! dark:hover:border-brand-500! rounded-xl border border-dashed! border-gray-300! bg-gray-50 p-7 lg:p-10 dark:border-gray-700! dark:bg-gray-900 dz-clickable" id="demo-upload" action="/upload">
                      <div class="dz-message m-0!">
                        <div class="mb-[22px] flex justify-center">
                          <div class="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                            <svg class="fill-current" width="29" height="28" viewBox="0 0 29 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path fill-rule="evenodd" clip-rule="evenodd" d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z" fill=""></path>
                            </svg>
                          </div>
                        </div>

                        <h4 class="text-theme-xl mb-3 font-semibold text-gray-800 dark:text-white/90">
                          Drag &amp; Drop File Here
                        </h4>
                        <span class="mx-auto mb-5 block w-full max-w-[290px] text-sm text-gray-700 dark:text-gray-400">
                          Drag and drop your PNG, JPG, WebP, SVG images here or
                          browse
                        </span>

                        <span class="text-theme-sm text-brand-500 font-medium underline">
                          Browse File
                        </span>
                      </div>
                    </form>
</div>
        <div class="w-full px-2.5 xl:w-1/2">
          <Label htmlFor="inputTwo">SKU or slug?</Label>
          <Input type="text" id="inputTwo"
/>
        </div>
      
      

        <div class="w-full px-2.5 xl:w-1/2">
          <DatePicker
            id="date-picker"
            label="Date Picker Input"
            placeholder="Select a date"
            onChange={(dates, currentDateString) => {
              // Handle your logic
              console.log({ dates, currentDateString });
            }}
          />
        </div>

           
        
      </div>

    </ComponentCard>


  );
}
