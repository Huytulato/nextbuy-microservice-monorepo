import { Pencil, WandSparkles, X } from 'lucide-react';
import React, { useEffect } from 'react'
import Image from 'next/image';

const ImagePlaceHolder = ({
  size, 
  small, 
  onImageChange, 
  pictureUploadingLoader,
  onRemove, 
  defaultImage = null, 
  index = null, 
  setSelectedImage,
  setOpenImageModal,
  images
}: {
  size: string, // Lưu ý: size này là text hiển thị (VD: "765x850"), không nên dùng làm className trừ khi nó là class tailwind
  small?: boolean,
  pictureUploadingLoader: boolean,
  onImageChange: (file: File, index: number) => void,
  onRemove: (index: number) => void,
  defaultImage?: string | null,
  index?: any,
  setSelectedImage?: (val: string) => void,
  images: any,
  setOpenImageModal?: (openImageModal: boolean) => void,
}) => {
  const [imagePreview, setImagePreview] = React.useState<string | null>(defaultImage);

  // Cập nhật lại preview nếu defaultImage thay đổi từ bên ngoài
  useEffect(() => {
    if (defaultImage) {
        setImagePreview(defaultImage);
    } else {
        setImagePreview(null);
    }
  }, [defaultImage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      onImageChange(file, index);
    }
  };

  return (
    // Thêm border và bg-gray-50 để nhìn thấy khung khi chưa có ảnh
    <div className={`relative w-full h-full min-h-[200px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden`}>
      
      <input
        type="file"
        accept="image/*"
        className="hidden"
        id={`image-upload-${index}`} // ID này quan trọng
        onChange={handleFileChange} 
      />

      {imagePreview ? (
        <>
          {/* Ảnh Preview */}
          <div className="relative w-full h-full">
             {/* Dùng fill để ảnh tự bung theo khung cha */}
             <Image 
                src={imagePreview}
                alt="Uploaded Image"
                fill
                className="object-cover"
             />
          </div>

          {/* Nút Xóa (Đẩy sang phải cùng) */}
          <button 
            type="button" 
            disabled={pictureUploadingLoader}
            onClick={() => {
                onRemove?.(index!)
                setImagePreview(null); // Clear preview ngay lập tức
            }}
            className='absolute top-2 right-2 p-2 rounded-full bg-red-600 hover:bg-red-700 shadow-lg z-10 transition-colors'  
          >
            <X size={14} color="#fff" />
          </button>
          
          {/* Nút Edit/AI (Đẩy sang trái một chút: right-12) */}
          <button
            disabled={pictureUploadingLoader}
            type="button"
            className='absolute top-2 right-12 p-2 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg z-10 transition-colors'
            onClick={() => {
                setOpenImageModal?.(true)
                setSelectedImage?.(images[index].file_url)
            }}
          >
            <WandSparkles size={14} color="#fff" />
          </button>
        </>
      ) : (
        // Giao diện khi chưa có ảnh
        // Quan trọng: htmlFor phải khớp với ID của input
        <label 
            htmlFor={`image-upload-${index}`} 
            className='flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100 transition-colors'
        >
          {/* Icon bút chì */}
          <div className='absolute top-3 right-3 p-2 rounded-full bg-slate-700 shadow-lg'>
            <Pencil size={16} color="#fff" />
          </div>

          {/* Text hướng dẫn */}
          <div className="flex flex-col items-center p-4">
             <p className={`text-gray-500 font-medium ${small ? 'text-sm' : 'text-base'} text-center`}>
                {size}
             </p>

             <p className={`text-gray-400 ${small ? 'text-xs' : 'text-sm'} text-center mt-2`}>
                Click to upload image
                <br />
                according to given size
             </p>
          </div>
        </label>
      )}
    </div>
  )
}

export default ImagePlaceHolder;