//get username initial names 
export const getUsernameInitials = ({ fullname }: { fullname: string }) => {
    const names = fullname.trim().split(" ");
    if (names.length === 0) return "";
    const firstInitial = names[0][0] || "";
    const lastInitial = names.length > 1 ? names[names.length - 1][0] || "" : "";
    return (firstInitial + lastInitial).toUpperCase();
};
