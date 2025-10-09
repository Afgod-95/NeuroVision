import supabase from "../../../lib/supabase";

export async function uploadToSupabase(userId: number, files: Express.Multer.File[]) {
    const uploaded = [];

    for (const file of files) {
        const filePath = `uploads/user_${userId}/${Date.now()}-${file.originalname}`;
        const { data, error } = await supabase.storage
            .from("chat_uploads")
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) {
            console.error("Upload error:", error);
            continue;
        }

        const { data: publicUrlData } = supabase.storage
            .from("chat_uploads")
            .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
            uploaded.push({
                id: `${Date.now()}-${file.originalname}`,
                name: file.originalname,
                type: file.mimetype,
                size: file.size,
                url: publicUrlData.publicUrl,
            });
        }
    }

    return uploaded;
}
