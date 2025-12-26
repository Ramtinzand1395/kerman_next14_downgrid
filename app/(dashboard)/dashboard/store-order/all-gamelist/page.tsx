// "use client";
// // todo
// // seach
// import { useEffect, useState } from "react";
// import GameListTable from "./GameListTable";
// import AddGameListModal from "./AddGameListModal";

// type GameLists = {
//   ps5: any[];
//   ps4: any[];
//   copy: any[];
//   xbox: any[];
// };

// export default function AllGameList() {
//   const [loading, setLoading] = useState(false);

//   const [gameList, setGameList] = useState<GameListItem[]>([]);
//   const [OpenModal, setOpenModal] = useState(false);

//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   useEffect(() => {
//     const getData = async () => {
//       try {
//         setLoading(true);

//         const res = await fetch(
//           `/api/admin/store-order/game-list?page=${page}`
//         );
//         const data = await res.json();
//         setGameList(data || []);
//       } catch (err) {
//         console.log(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     getData();
//   }, [page]);
//   console.log(gameList);

//   return (
//     <div className="mx-2">
//       <div className="flex items-center justify-between">
//         <button
//           onClick={() => setOpenModal(true)}
//           className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
//         >
//           افزودن بازی
//         </button>
//       </div>
//       {/* <div className="flex justify-start my-4">
//         <input
//           type="text"
//           placeholder="جستجوی نام بازی..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           className="px-4 py-2 border border-gray-300 rounded w-full max-w-md"
//         />
//       </div> */}

//       <div className="w-full md:container md:mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mx-2 my-10">
//         {gameList.map((list) => (
//           <GameListTable
//             key={list.platform}
//             title={list.platform}
//             platform={list.platform}
//             list={list.items}
//           />
//         ))}
//       </div>

//       {/* Pagination */}
//       <div className="flex justify-center items-center gap-2 my-8">
//         <button
//           className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 disabled:opacity-50"
//           disabled={page === 1}
//           onClick={() => setPage((p) => p - 1)}
//         >
//           قبلی
//         </button>
//         <button
//           className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 disabled:opacity-50"
//           disabled={page === totalPages}
//           onClick={() => setPage((p) => p + 1)}
//         >
//           بعدی
//         </button>
//       </div>

//       {OpenModal && <AddGameListModal setOpenModal={setOpenModal} />}
//     </div>
//   );
// }

// todo
// همه api ها در پلترفورم های مختلف مشکل دارند
// همه موارد با pnpm نصب بشه
"use client";
import { useEffect, useState } from "react";
import GameListTable from "./GameListTable";
import AddGameListModal from "./AddGameListModal";
import { GameList } from "@/types";


export default function AllGameList() {
  const [loading, setLoading] = useState(false);
  const [gameList, setGameList] = useState<GameList[]>([]);
  const [OpenModal, setOpenModal] = useState(false);

  // پجینیشن برای هر پلتفرم
  const [pageMap, setPageMap] = useState<Record<string, number>>({});
  const [limit] = useState(20);
  const [totalPagesMap, setTotalPagesMap] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/admin/store-order/game-list?limit=${limit}`
        );
        const data = await res.json();
        setGameList(data.gameList || []);

        // ایجاد map برای صفحه اول هر پلتفرم
        const pages: Record<string, number> = {};
        const totals: Record<string, number> = {};
        data.gameList.forEach((platform: GameList, i: number) => {
          pages[platform.platform] = 1; // شروع از صفحه 1
          totals[platform.platform] = data.totalPages[i];
        });
        setPageMap(pages);
        setTotalPagesMap(totals);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [limit]);
  // تغییر صفحه برای یک پلتفرم
  const handlePageChange = (platform: string, newPage: number) => {
    setPageMap((prev) => ({ ...prev, [platform]: newPage }));
    fetchPage(platform, newPage);
  };

  // گرفتن صفحه خاص برای یک پلتفرم
  const fetchPage = async (platform: string, page: number) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/store-order/game-list?platform=${platform}&page=${page}&limit=${limit}`
      );
      const data = await res.json();
      setGameList((prev) =>
        prev.map((p) =>
          p.platform === platform ? { ...p, items: data.gameList[0].items } : p
        )
      );
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpenModal(true)}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
        >
          افزودن بازی
        </button>
      </div>

      <div className="w-full md:container md:mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mx-2 my-10">
        {gameList.map((list) => (
          <div key={list.platform}>
            <GameListTable
              title={list.platform}
              platform={list.platform}
              list={list.items}
            />

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 my-4">
              <button
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 disabled:opacity-50"
                disabled={pageMap[list.platform] === 1}
                onClick={() =>
                  handlePageChange(list.platform, pageMap[list.platform] - 1)
                }
              >
                قبلی
              </button>
              <span className="px-3 py-1">
                {pageMap[list.platform]} / {totalPagesMap[list.platform]}
              </span>
              <button
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 disabled:opacity-50"
                disabled={
                  pageMap[list.platform] === totalPagesMap[list.platform]
                }
                onClick={() =>
                  handlePageChange(list.platform, pageMap[list.platform] + 1)
                }
              >
                بعدی
              </button>
            </div>
          </div>
        ))}
      </div>

      {OpenModal && <AddGameListModal setOpenModal={setOpenModal} />}
    </div>
  );
}
