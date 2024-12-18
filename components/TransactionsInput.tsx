import { cn } from '@/lib/utils'
import * as XLSX from "xlsx";
import axios from "axios"
import React, { useRef, useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from './ui/button'
import { create_JWT, getLoggedInUser } from '@/lib/actions/user.actions';
import { get_cookie, isJWTExpired } from '@/lib/auth';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { bankLinks } from '@/constants';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Label } from '@radix-ui/react-label';
import { Input } from './ui/input';
import Link from 'next/link';
import { Separator } from "@/components/ui/separator"
import BankManue from './BankManue';

interface RowData {
  [key: string]: string | number | boolean; // Dynamic row structure
}

const TransactionsInput = () => {
  const [data, setData] = useState<RowData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = useState<string>('upload'); 
  
  const triggerFileInput = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer; // Read the file as an ArrayBuffer
        const data = new Uint8Array(arrayBuffer); // Convert the ArrayBuffer to Uint8Array
        const workbook = XLSX.read(data, { type: "array" }); // Use type 'array' for XLSX
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData: RowData[] = XLSX.utils.sheet_to_json<RowData>(sheet); // Convert the sheet to JSON
        console.log(parsedData);
        setData(parsedData);
        
        // Send parsed data to the FastAPI backend
        try {
          const user = await getLoggedInUser();
          if (!user) {
              throw new Error("No active session found for the user.");
          }

          console.log("Logged-in User:", user); // Debugging

          let jwt = await get_cookie()

          if( await isJWTExpired(jwt)){
            console.log("JWT is expired, generating a new one...");
            await create_JWT()
            jwt = await get_cookie()
            console.log("New JWT", jwt);
          }else{
            console.log("JWT is valid", jwt);
          }

          const response = await axios.post("http://localhost:8000/api/transactions/", 
            parsedData,
            {
              headers: {
                Authorization: `Bearer ${jwt}`, // Add JWT to Authorization header
              },
              withCredentials: true, // Ensures session cookies are sent
            }
          );
          console.log("Server Response:", response.data);
        } catch (error) {
          console.error("Error sending data to server:", error);
        }
      };

      reader.readAsArrayBuffer(file); // Use readAsArrayBuffer instead of readAsBinaryString
    }
  }

  return (
    <div className='sidebar-link flex cursor-pointer justify-start gap-2 py-6 hover:bg-financeGradient hover:text-white'>
      {/* Upload File */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div  className='flex gap-3'>
            <div className='relative size-6 hover:brightness-0'>
              <Image
                src="icons/upload.svg" // Replace with your image path
                alt="Upload File"
                style={{ cursor: "pointer" }}
                fill
              />
            </div>
            <p className='sidebar-label'>
              Upload
            </p>
          </div>
        </DialogTrigger>

        <BankManue setIsOpen={setIsOpen} />
        
      </Dialog>
    </div>
  );
}

export default TransactionsInput;
