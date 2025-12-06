import React from 'react'

const DeleteDiscountCodeModal = ({
  discount, onClose, onConfirm
} : {discount: any, onClose: (e: boolean) => void, onConfirm?: any}) => {
  return (
    <div className='fixed top-0 left-0 w-full h-full bg-white bg-opacity-50 flex'>
      <div className='m-auto bg-white rounded-lg p-6 w-full max-w-md' >
        {/* Modal Header */}
        <h3 className="text-xl font-semibold mb-4">Delete Discount Code</h3>
        <button onClick={() => onClose(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          Cancel
        </button>
        <button onClick={onConfirm} className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
          Delete
        </button>
      </div>
    </div>
  )
}

export default DeleteDiscountCodeModal