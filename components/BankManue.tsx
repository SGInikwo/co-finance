import { bankLinks, sidebarLinks } from '@/constants';
import Link from 'next/link';
import React, { useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog"
import axios from "axios"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from './ui/button'
import * as XLSX from "xlsx";
import { create_JWT, getLoggedInUser } from '@/lib/actions/user.actions';
import { get_cookie, isJWTExpired } from '@/lib/auth';
import { Separator } from './ui/separator';
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast';

interface RowData {
  [key: string]: string | number | boolean; // Dynamic row structure
}

interface BankManueProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const BankManue: React.FC<BankManueProps> = ({ setIsOpen }) => {
  const { toast } = useToast()
  const router = useRouter();
  const [data, setData] = useState<RowData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // const [isOpen, setIsOpen] = React.useState(false);
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
          setIsOpen(false);
          toast({
            variant: "succes",
            title: "Data is send!",
            description: "Your data is being saved.",
          });
        } catch (error) {
          console.error("Error sending data to server:", error);
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "There was a problem with your request.",
          });
        }
      };

      reader.readAsArrayBuffer(file); // Use readAsArrayBuffer instead of readAsBinaryString
    }
  }
  return (
    <div>
      <DialogContent className="w-[600px] h-[500px] flex justify-center items-center z-50 bg-gray-300"> {/* Ensure z-index is high enough */}
        <DialogHeader>
          <DialogDescription className="flex flex-col justify-center items-center w-full">
            <div className='justify-center items-center '>
              <Tabs value={selectedValue} onValueChange={setSelectedValue} className="w-[400px] justify-center items-center">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger 
                    value="upload" 
                    className={cn('text-gray-500', {
                      'bg-financeGradient text-white': selectedValue === 'upload', 
                    })}

                  >
                    Upload
                  </TabsTrigger>
                  <TabsTrigger 
                    value="banks" 
                    className={cn('text-gray-500', {
                      'bg-financeGradient text-white': selectedValue === 'banks', 
                    })}

                  >
                    Banks
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex justify-center'>
                        Add your statements here!
                      </CardTitle>
                      {/* <CardDescription>
                        Add your statements here!
                      </CardDescription> */}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-center items-center space-y-1">
                        {/* Button acting as a file input */}
                        <Button
                          type="button"
                          onClick={triggerFileInput}
                          className='bg-financeGradient text-white'
                        >
                          Upload File
                        </Button>

                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleFileUpload}
                          style={{ display: "none" }} // Hide the file input
                        /> 
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="banks">
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex justify-center'>
                        List of Banks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1">
                        {bankLinks.map((bank) => {
                          // const isActive = pathName === item.route || pathName.startsWith(`${item.route}/`);
                          return (
                            <Link 
                              href={bank.bankURL} 
                              key={bank.label}
                              target="_blank" // Open in a new tab
                              rel="noopener noreferrer" // Security for _blank
                              // className={cn('sidebar-link', {
                              //   'bg-financeGradient': isActive
                              // })}
                              className='flex gap-3 items-center py-1 md:p-3 2xl:p-4 rounded-full justify-center'
                            >
                              <div className='relative size-6'>
                                <Image 
                                  src={bank.imgURL}  // Update this if you want to include an image for each bank
                                  alt={bank.label}
                                  fill
                                  // className={cn('filter', {
                                  //   'brightness-0 invert': isActive
                                  // })}
                                />
                              </div>
                              {/* <p className={cn("sidebar-label", { "!text-white": isActive })}> */}
                              <p>
                                {bank.label}
                                <Separator />
                              </p>  
                            </Link>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </div>
  )
}

export default BankManue