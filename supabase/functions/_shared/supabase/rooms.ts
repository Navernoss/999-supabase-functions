import { supabase } from "./index.ts";
import {
  RoomNode,
  SelectIzbushkaError,
  SupabaseResponse,
} from "../types/index.ts";
import { getUid } from "./users.ts";

export const getRoomById = async (
  room_id: string,
): Promise<{
  roomData?: RoomNode;
  isExistRoom: boolean;
}> => {
  console.log(room_id, "room_id");
  try {
    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_id", room_id)
      .single();

    if (roomError) {
      throw new Error("Error getRoomById: " + roomError.message);
    }

    if (!roomData) {
      console.log("Room not found");
      return {
        isExistRoom: false,
      };
    }
    console.log(roomData, "roomData");
    return {
      roomData,
      isExistRoom: true,
    };
  } catch (error) {
    console.error("Error getRoomById:", error);
    throw new Error("Error getRoomById: " + error.message);
  }
};

export const getRoomsWater = async (
  username: string,
): Promise<RoomNode[]> => {
  try {
    const uid = await getUid(username);

    const { data, error } = await supabase
      .from("user_passport")
      .select(`*, rooms(id, name, chat_id, type, codes)`)
      .eq("user_id", uid)
      .eq("is_owner", false)
      .eq("type", "room");

    if (error) {
      throw new Error("Error getRooms water: " + error);
    }

    const transformedArray = data?.map((item) => ({
      ...item,
      ...item.rooms,
      rooms: undefined,
    }));

    return transformedArray || [];
  } catch (error) {
    throw new Error("Error getRooms water: " + error);
  }
};

export const getRooms = async (
  username: string,
): Promise<RoomNode[]> => {
  try {
    const uid = await getUid(username);
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("user_id", uid);

    if (error) {
      throw new Error("Error getRooms: " + error);
    }
    return data || [];
  } catch (error) {
    throw new Error("Error getRooms: " + error);
  }
};

export const getRoomsCopperPipes = async (): Promise<RoomNode[]> => {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("public", true);

    if (error) {
      throw new Error("Error getRooms copper pipes: " + error);
    }

    return data;
  } catch (error) {
    console.error(error, "error getRooms copper pipes");
    throw new Error("Error getRooms copper pipes: " + error);
  }
};

export const getSelectIzbushkaId = async (
  selectIzbushka: string,
): Promise<
  {
    izbushka: RoomNode | null;
    selectIzbushkaError: SelectIzbushkaError | null;
    dataIzbushka: RoomNode[] | null;
  }
> => {
  try {
    const response: SupabaseResponse<RoomNode> = await supabase
      .from("rooms")
      .select("*")
      .eq("id", selectIzbushka);

    const izbushka = response.data ? response.data[0] : null;

    if (izbushka) {
      return {
        izbushka,
        dataIzbushka: response.data,
        selectIzbushkaError: null,
      };
    } else {
      return {
        izbushka: null,
        dataIzbushka: [],
        selectIzbushkaError: response.error,
      };
    }
  } catch (error) {
    console.error(error, "error getSelectIzbushkaId");
    throw new Error("Error getSelectIzbushkaId: " + error);
  }
};

export async function createRoom(
  username: string,
): Promise<RoomNode[]> {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("username", username);

    if (error) {
      console.error(error, "error createRoom");
    }

    if (data === null) {
      throw new Error("No data returned from select");
    }

    return data;
  } catch (error) {
    console.error(error, "error createRoom");
    throw new Error("Error createRoom: " + error);
  }
}
