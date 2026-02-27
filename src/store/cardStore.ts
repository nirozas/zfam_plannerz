import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Card, CardType } from '../types/cards';
import { supabase } from '../supabase/client';
import { sendEmail, createInvitationEmail } from '../utils/mailer';

interface CardState {
    cards: Card[];
    currentFolderId: string | null;
    isFetching: boolean;
    rootBackground: string | null;
    rootBackgroundType: 'color' | 'image';
    rootBackgroundOpacity: number;
    fetchCards: (force?: boolean) => Promise<void>;
    lastCardsFetch?: number;
    addCard: (type: CardType, title: string, parentId: string | null, category?: string, rating?: number, coverImage?: string, description?: string, url?: string, hasBody?: boolean) => Promise<void>;
    updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
    setRootBackground: (type: 'color' | 'image', value: string | null, opacity?: number) => void;
    deleteCard: (id: string) => Promise<void>;
    setCurrentFolderId: (id: string | null) => void;
    getCardsByParent: (parentId: string | null) => Card[];
    getBreadcrumbs: (folderId: string | null) => { id: string | null; title: string }[];
    shareCard: (cardId: string, email: string) => Promise<void>;
}

export const useCardStore = create<CardState>()(
    persist(
        (set, get) => ({
            cards: [],
            currentFolderId: null,
            isFetching: false,
            rootBackground: localStorage.getItem('root_background'),
            rootBackgroundType: (localStorage.getItem('root_background_type') as 'color' | 'image') || 'color',
            rootBackgroundOpacity: parseInt(localStorage.getItem('root_background_opacity') || '100'),
            lastCardsFetch: 0,


            fetchCards: async (force = false) => {
                const { cards, lastCardsFetch } = get();
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return;

                // Simple cache: data is fresh for 30s
                const now = Date.now();
                if (!force && cards.length > 0 && lastCardsFetch && (now - lastCardsFetch < 30000)) {
                    return;
                }

                if (get().isFetching && !force) return;

                set({ isFetching: true });
                const { data, error } = await supabase
                    .from('cards')
                    .select('*')
                    .or(`user_id.eq.${session.user.id},shared_with.cs.{${session.user.id}}`)
                    .order('created_at', { ascending: true });

                if (!error && data) {
                    const mappedCards: Card[] = data.map(c => ({
                        id: c.id,
                        parentId: c.parent_id,
                        type: c.type,
                        title: c.title,
                        description: c.description,
                        coverImage: c.cover_image,
                        content: c.content,
                        url: c.url,
                        hasBody: c.has_body,
                        width: c.width,
                        height: c.height,
                        rating: c.rating,
                        backgroundUrl: c.background_url,
                        backgroundType: c.background_type,
                        backgroundOpacity: c.background_opacity ?? 100,
                        category: c.category,
                        notes: c.notes || [],
                        sharedWith: c.shared_with || [],
                        createdAt: c.created_at,
                        lastViewedAt: c.last_viewed_at,
                        itemCount: c.item_count,
                        lineCount: c.line_count,
                        canvasData: c.canvas_data,
                        groups: c.groups || []
                    }));
                    set({
                        cards: mappedCards,
                        lastCardsFetch: Date.now()
                    });
                }
                set({ isFetching: false });
            },

            addCard: async (type, title, parentId, category, rating, coverImage, description, url, hasBody) => {
                const { data: { session } } = await supabase.auth.getSession();
                const tempId = crypto.randomUUID();
                const newCard: Card = {
                    id: tempId,
                    parentId,
                    type,
                    title,
                    category,
                    rating,
                    coverImage,
                    description,
                    url,
                    hasBody: (type === 'list') ? (hasBody ?? true) : undefined,
                    createdAt: new Date().toISOString(),
                    lastViewedAt: new Date().toISOString(),
                    sharedWith: [],
                    notes: []
                };

                // Optimistic update
                set((state) => ({
                    cards: [...state.cards, newCard],
                }));

                if (session?.user) {
                    console.log(`Adding ${type} "${title}" to Supabase...`);
                    const { error } = await supabase
                        .from('cards')
                        .insert({
                            id: tempId,
                            user_id: session.user.id,
                            parent_id: parentId,
                            type,
                            title,
                            category,
                            rating,
                            cover_image: coverImage,
                            description,
                            url,
                            has_body: newCard.hasBody,
                            notes: []
                        });

                    if (error) {
                        console.error('CRITICAL: Error adding card to Supabase:', {
                            error,
                            message: error.message,
                            details: error.details,
                            hint: error.hint,
                            code: error.code
                        });
                    } else {
                        console.log('Successfully saved to Supabase');
                    }
                }
            },

            updateCard: async (id, updates) => {
                console.log(`Updating card ${id}...`, updates);
                // Optimistic update
                set((state) => ({
                    cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
                }));

                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const updatedData: any = {};
                    if (updates.title !== undefined) updatedData.title = updates.title;
                    if (updates.description !== undefined) updatedData.description = updates.description;
                    if (updates.coverImage !== undefined) updatedData.cover_image = updates.coverImage;
                    if (updates.content !== undefined) updatedData.content = updates.content;
                    if (updates.url !== undefined) updatedData.url = updates.url;
                    if (updates.hasBody !== undefined) updatedData.has_body = updates.hasBody;
                    if (updates.width !== undefined) updatedData.width = updates.width;
                    if (updates.height !== undefined) updatedData.height = updates.height;
                    if (updates.rating !== undefined) updatedData.rating = updates.rating;
                    if (updates.backgroundUrl !== undefined) updatedData.background_url = updates.backgroundUrl;
                    if (updates.backgroundType !== undefined) updatedData.background_type = updates.backgroundType;
                    if (updates.backgroundOpacity !== undefined) updatedData.background_opacity = updates.backgroundOpacity;
                    if (updates.category !== undefined) updatedData.category = updates.category;
                    if (updates.notes !== undefined) updatedData.notes = updates.notes;
                    if (updates.lastViewedAt !== undefined) updatedData.last_viewed_at = updates.lastViewedAt;
                    if (updates.sharedWith !== undefined) updatedData.shared_with = updates.sharedWith;
                    if (updates.canvasData !== undefined) updatedData.canvas_data = updates.canvasData;
                    if (updates.groups !== undefined) updatedData.groups = updates.groups;

                    updatedData.updated_at = new Date().toISOString();

                    const { error } = await supabase
                        .from('cards')
                        .update(updatedData)
                        .eq('id', id);

                    if (error) {
                        console.error('CRITICAL: Error updating card in Supabase:', error);
                    } else {
                        console.log('Successfully updated card in Supabase');
                    }
                }
            },

            setRootBackground: (type, value, opacity = 100) => {
                if (value) {
                    localStorage.setItem('root_background', value);
                    localStorage.setItem('root_background_type', type);
                    localStorage.setItem('root_background_opacity', opacity.toString());
                } else {
                    localStorage.removeItem('root_background');
                    localStorage.removeItem('root_background_type');
                    localStorage.removeItem('root_background_opacity');
                }
                set({ rootBackground: value, rootBackgroundType: type, rootBackgroundOpacity: opacity });
            },

            deleteCard: async (id) => {
                set((state) => ({
                    cards: state.cards.filter((c) => c.id !== id && c.parentId !== id),
                }));

                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { error } = await supabase
                        .from('cards')
                        .delete()
                        .eq('id', id);

                    if (error) console.error('Error deleting card from Supabase:', error);
                }
            },

            setCurrentFolderId: (id) => set({ currentFolderId: id }),

            getCardsByParent: (parentId) => {
                return get().cards.filter((c) => c.parentId === parentId);
            },

            getBreadcrumbs: (folderId) => {
                const breadcrumbs: { id: string | null; title: string }[] = [{ id: null, title: 'Home' }];
                if (!folderId) return breadcrumbs;

                const path: { id: string | null; title: string }[] = [];
                let currentId: string | null = folderId;

                while (currentId) {
                    const folder = get().cards.find((c) => c.id === currentId);
                    if (folder) {
                        path.unshift({ id: folder.id, title: folder.title });
                        currentId = folder.parentId;
                    } else {
                        break;
                    }
                }

                return [...breadcrumbs, ...path];
            },

            shareCard: async (cardId, email) => {
                const { cards, updateCard } = get();
                const card = cards.find(c => c.id === cardId);
                if (!card) throw new Error("Card not found");

                // 1. Find user ID by email via RPC
                const { data: receiverId, error: rpcError } = await supabase
                    .rpc('get_user_id_by_email', { p_email: email });

                if (rpcError || !receiverId) {
                    throw new Error('User not found with that email. They must have an account first.');
                }

                // 2. Avoid sharing with self
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id === receiverId) {
                    throw new Error('You cannot share a card with yourself.');
                }

                // 3. Update shared_with array
                const sharedWith = [...(card.sharedWith || [])];
                if (!sharedWith.includes(receiverId)) {
                    sharedWith.push(receiverId);
                    await updateCard(cardId, { sharedWith });

                    // Send notification
                    if (session?.user) {
                        try {
                            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
                            const mailerHtml = createInvitationEmail(
                                profile?.full_name || session.user.email || 'Someone',
                                card.title,
                                'card'
                            );
                            sendEmail({
                                to: email,
                                subject: `${profile?.full_name || 'A user'} shared a vault entry with you`,
                                html: mailerHtml
                            });
                        } catch (e) {
                            console.warn('Card share email failed:', e);
                        }
                    }
                }
            },
        }),
        {
            name: 'cards-storage',
            partialize: (state) => ({
                rootBackground: state.rootBackground,
                rootBackgroundType: state.rootBackgroundType,
                rootBackgroundOpacity: state.rootBackgroundOpacity,
            }),
        }
    )
);
