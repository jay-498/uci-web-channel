import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { User } from "./types";
import Home from "./pages/home";
import Chats from "./pages/chats";
import StarredChats from "./pages/starred-chats";
import StarredChatsPage from "./pages/starred-chat-page";
import axios from "axios";
import { AppContext } from "./utils/app-context";
import { CookiesProvider } from "react-cookie";
import { send } from "./components/websocket";
import moment from "moment";
import { toast, Toaster } from "react-hot-toast";
import { normalizeUsers } from "./utils/normalize-user";
import { socket } from "./socket";
import { includes, without, map, sortBy, reverse } from "lodash";
import { getBotDetailsUrl } from "./utils/urls";
// import { setLocalStorage } from "./utils/set-local-storage";
import { initialState } from "./utils/initial-states";

const App: FC = () => {
  // All Users
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>();

  const [loading, setLoading] = useState(true);
  const [starredMsgs, setStarredMsgs] = useState({});
  const [messages, setMessages] = useState([]);

  const botStartingMsgs = useMemo(
    () =>
      map(users, (user) => ({ id: user?.botUuid, msg: user?.startingMessage })),
    [users]
  );

  // useEffect(() => {
  //   setLocalStorage();
  // }, []);

  const [isConnected, setIsConnected] = useState(socket.connected);

  const connect = useCallback(() => {
    window && window?.androidInteract?.log("socket: connect triggered");
    console.log("socket: socket.connect triggered");
    socket.connect();
  }, []);

  useEffect(() => {
    if (!isConnected) connect();
  }, [isConnected, connect]);

  const [state, setState] = useState<{
    allMessages: {
      user: string;
      phoneNumber: string | null;
      messages: any[];
    }[];
    messages: any[];
    username: string;
    session: any;
  }>(initialState);

  const updateMsgState = useCallback(({ user, msg, media }) => {
    const newMsg = {
      username: user?.name,
      text: msg.content.title,
      choices: msg.content.choices,
      position: "left",
      id: user?.id,
      botUuid: user?.id,
      messageId: msg?.messageId,
      ...media,
    };
    setMessages((prev: any) => [...prev, newMsg]);
  }, []);

  const onMessageReceived = useCallback(
    (msg: any): void => {
      console.log("socket receiving msg:", { msg });
      window &&
        window?.androidInteract?.log(`socket: receiving bot response -${msg}`);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const user = JSON.parse(localStorage.getItem("currentUser"));
      //  console.log("qwe12 message: ", { msg, currentUser, uu: JSON.parse(localStorage.getItem('currentUser')) });
      if (msg.content.msg_type === "IMAGE") {
        updateMsgState({
          user,
          msg,
          media: { imageUrl: msg?.content?.media_url },
        });
      } else if (msg.content.msg_type === "AUDIO") {
        updateMsgState({
          user,
          msg,
          media: { audioUrl: msg?.content?.media_url },
        });
      } else if (msg.content.msg_type === "VIDEO") {
        updateMsgState({
          user,
          msg,
          media: { videoUrl: msg?.content?.media_url },
        });
      } else if (
        msg.content.msg_type === "DOCUMENT" ||
        msg.content.msg_type === "FILE"
      ) {
        updateMsgState({
          user,
          msg,
          media: { fileUrl: msg?.content?.media_url },
        });
      } else if (msg.content.msg_type === "TEXT") {
        updateMsgState({ user, msg, media: {} });
      }

      localStorage.setItem(
        "userMsgs",
        JSON.stringify([
          ...messages,
          {
            username: user?.name,
            text: msg.content.title,
            choices: msg.content.choices,
            position: "left",
          },
        ])
      );
    },
    [messages, updateMsgState]
  );

  const onSessionCreated = useCallback((session: { session: any }): void => {
    setState((prev) => ({
      ...prev,
      session: session,
    }));
  }, []);

  const onException = useCallback((exception: any) => {
    toast.error(exception?.message);
    window && window?.androidInteract?.onTriggerLogout();
  }, []);

  useEffect(() => {
    function onConnect(): void {
      console.log("socket:  onConnect callback");
      window && window?.androidInteract?.log(`socket: onConnectCallback`);
      setIsConnected(true);
    }

    function onDisconnect(): void {
      console.log("socket: disconnecting");
      window && window?.androidInteract?.log(`socket: onDisconnectCallback`);
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("botResponse", onMessageReceived);

    socket.on("exception", onException);
    socket.on("session", onSessionCreated);

    return () => {
      window &&
        window?.androidInteract?.log(
          `socket: turning off everything on return`
        );
      socket.disconnect();
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("botResponse", onMessageReceived);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onException, onSessionCreated]);

  useEffect(() => {
    if (localStorage.getItem("starredChats")) {
      setStarredMsgs(JSON.parse(localStorage.getItem("starredChats")));
    }
  }, []);

  // getting botList from android and fetching bot details
  useEffect(() => {
    try {
      const checkOnline = async (): Promise<void> => {
        if (window.navigator.onLine) {
          // window && window?.androidInteract?.log(localStorage.getItem('botList'));
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const botIds = JSON.parse(localStorage.getItem("botList"));
          console.log("asdf:", { botIds });

          const config = {
            headers: {
              "Content-Type": "application/json",
              ownerID: process.env.REACT_APP_OWNER_ID,
              ownerOrgID: process.env.REACT_APP_OwnerOrgId,
              "admin-token": process.env.REACT_APP_Admin_Token,
            },
          };

          axios
            .get(getBotDetailsUrl(), config)
            .then((response): any => {
              const botDetailsList = without(
                reverse(
                  sortBy(
                    response?.data?.result?.map((bot: any, index: number) => {
                      if (
                        bot?.logicIDs?.[0]?.transformers?.[0]?.meta?.type !==
                          "broadcast" &&
                        includes(botIds, bot?.id)
                      ) {
                        if (index === 0)
                          return normalizeUsers({
                            ...bot,
                            botUuid: bot?.id,
                            active: true,
                            createTime: moment(bot?.createdAt).valueOf(),
                          });
                        return normalizeUsers({
                          ...bot,
                          active: false,
                          botUuid: bot?.id,
                          createTime: moment(bot?.createdAt).valueOf(),
                        });
                      }
                      return null;
                    }),
                    ["createTime"]
                  )
                ),
                null
              );

              window &&
                window?.androidInteract?.log(JSON.stringify(botDetailsList));

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              setUsers(botDetailsList);
              setLoading(false);
              window?.androidInteract?.onBotDetailsLoaded(
                JSON.stringify(botDetailsList)
              );
              if (localStorage.getItem("currentUser")) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                setCurrentUser(JSON.parse(localStorage.getItem("currentUser")));
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
              } else setCurrentUser(botDetailsList?.[0]);
            })
            .catch((err) => console.log("qwerty:", { err }));
        } else {
          setLoading(false);
          if (localStorage.getItem("botDetails")) {
            setUsers(JSON.parse(localStorage.getItem("botDetails")));
            setCurrentUser(JSON.parse(localStorage.getItem("botDetails"))?.[0]);
          }
        }
      };
      checkOnline();
    } catch (err: any) {
      toast.error(err?.message);
      window &&
        window?.androidInteract?.log(
          `error in fetching botList:${JSON.stringify(err)}`
        );
    }
  }, []);

  const onChangeCurrentUser = useCallback((newUser: User) => {
    setCurrentUser({ ...newUser, active: true });
    localStorage.removeItem("userMsgs");
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    (text: string, media: any, isVisibile = true): void => {
      send(text, state.session, null, currentUser, socket, null);
      if (isVisibile)
        if (media) {
          if (media.mimeType.slice(0, 5) === "image") {
            setState((prev) => ({
              ...prev,
              messages: prev.messages.concat({
                username: prev.username,
                image: media.url,
                position: "right",
              }),
            }));
          } else if (media.mimeType.slice(0, 5) === "audio" && isVisibile) {
            setState((prev) => ({
              ...prev,
              messages: prev.messages.concat({
                username: prev.username,
                audio: media.url,
                position: "right",
              }),
            }));
          } else if (media.mimeType.slice(0, 5) === "video") {
            setState((prev) => ({
              ...prev,
              messages: prev.messages.concat({
                username: prev.username,
                video: media.url,
                position: "right",
              }),
            }));
          } else if (media.mimeType.slice(0, 11) === "application") {
            setState((prev) => ({
              ...prev,
              messages: prev.messages.concat({
                username: prev.username,
                doc: media.url,
                position: "right",
              }),
            }));
          } else {
            setState((prev) => ({
              ...prev,
              messages: prev.messages.concat({
                username: prev.username,
                text: text,
                doc: media.url,
                position: "right",
              }),
            }));
          }
        } else {
          localStorage.setItem(
            "userMsgs",
            JSON.stringify([
              ...messages,
              {
                username: state.username,
                text: text,
                position: "right",
                botUuid: currentUser?.id,
                disabled: true,
              },
            ])
          );

          //@ts-ignore
          setMessages((prev) => [
            ...map(prev, (prevMsg) => ({ ...prevMsg, disabled: true })),
            {
              username: state.username,
              text: text,
              position: "right",
              botUuid: currentUser?.id,
              payload: { text },
              time: moment().valueOf(),
              disabled: true,
            },
          ]);
        }
    },
    [state.session, state.username, currentUser, messages]
  );

  const values = useMemo(
    () => ({
      currentUser,
      allUsers: users,
      toChangeCurrentUser: onChangeCurrentUser,
      state,
      setState,
      sendMessage,
      messages,
      setMessages,
      starredMsgs,
      setStarredMsgs,
      loading,
      setLoading,
      botStartingMsgs,
    }),
    [
      currentUser,
      users,
      onChangeCurrentUser,
      state,
      sendMessage,
      messages,
      starredMsgs,
      setStarredMsgs,
      loading,
      setLoading,
      botStartingMsgs,
    ]
  );

  return (
    <Router>
      <CookiesProvider>
        <AppContext.Provider value={values}>
          <>
            <Switch>
              <Route path="/" exact>
                <Home />
              </Route>
              <Route path="/chats/:id">
                <Chats />
              </Route>
              <Route path="/starredChats" exact>
                <StarredChats />
              </Route>
              <Route path="/starredChats/:id">
                <StarredChatsPage />
              </Route>
            </Switch>
            <Toaster position="top-right" reverseOrder={false} />
          </>
        </AppContext.Provider>
      </CookiesProvider>
    </Router>
  );
};

export default App;
