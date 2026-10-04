import type {Metadata} from "next";

export const metadata:Metadata={
 title:"Accept Workforce Invitation | BuildPulse",
 description:"Secure BuildPulse workforce invitation acceptance.",
 robots:{index:false,follow:false},
 alternates:{canonical:"/workforce/accept"}
};

export default function WorkforceAcceptLayout({children}:{children:React.ReactNode}){return children}
