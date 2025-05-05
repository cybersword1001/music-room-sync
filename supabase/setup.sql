
-- Create rooms table
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    room_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create songs table
CREATE TABLE public.songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    added_by UUID REFERENCES auth.users(id),
    votes INTEGER NOT NULL DEFAULT 0,
    is_playing BOOLEAN NOT NULL DEFAULT false,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    thumbnail TEXT,
    artist TEXT,
    duration TEXT
);

-- Create votes table (to track who voted for what song)
CREATE TABLE public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(song_id, user_id)
);

-- Create row level security policies
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all rooms
CREATE POLICY "Anyone can view rooms" ON public.rooms
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own rooms
CREATE POLICY "Users can insert their own rooms" ON public.rooms
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow room creators to update and delete their rooms
CREATE POLICY "Room creators can update their rooms" ON public.rooms
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Room creators can delete their rooms" ON public.rooms
    FOR DELETE USING (auth.uid() = created_by);

-- Anyone can view songs in a room
CREATE POLICY "Anyone can view songs" ON public.songs
    FOR SELECT USING (true);

-- Any authenticated user can add songs to a room
CREATE POLICY "Authenticated users can add songs" ON public.songs
    FOR INSERT WITH CHECK (auth.uid() = added_by);

-- Any authenticated user can update songs (for voting)
CREATE POLICY "Authenticated users can update songs" ON public.songs
    FOR UPDATE USING (true);

-- Only the song adder can delete their song
CREATE POLICY "Song adders can delete their songs" ON public.songs
    FOR DELETE USING (auth.uid() = added_by);

-- Votes policies
CREATE POLICY "Anyone can view votes" ON public.votes
    FOR SELECT USING (true);

-- Users can only insert their own votes
CREATE POLICY "Users can only insert their own votes" ON public.votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own votes
CREATE POLICY "Users can only delete their own votes" ON public.votes
    FOR DELETE USING (auth.uid() = user_id);
